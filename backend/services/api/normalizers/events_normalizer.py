"""
Version-aware normalizer for FindFace Security events API payloads.

Supports without hardcoded assumptions:
  FFS 1.2   — camera as plain string, "date" timestamp, DRF count/results envelope
  FFS 2.1+  — camera as dict with status, "event_time" timestamp, fps/dropped_frames,
               may use "total"/"items" envelope variant

Version is detected purely from payload structure.
All field access uses .get() — no KeyError possible on untrusted data.

Normalized output contract (stable regardless of FFS version):
{
    "frs_version_detected": "1.2" | "2.1+" | "unknown",
    "total_events":         int,
    "page_sample_size":     int,
    "latest_event_time":    str | None,
    "cameras": [{"id": str, "name": str, "status": str|None, "active": bool|None, "comment": str|None}],
    "fps":           {"avg": float|None, "min": float|None, "max": float|None},
    "dropped_frames":{"total": int|None, "per_camera": [{"camera_id": str, "count": int}]},
    "health_summary":{"cameras_total": int, "cameras_active": int|None,
                      "cameras_inactive": int|None, "cameras_status_unknown": int|None},
}
"""
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Field candidate lists (priority-ordered) ──────────────────────────────────

_ENVELOPE_COUNT  = ("count", "total", "total_count", "num_results", "size")
_ENVELOPE_ITEMS  = ("results", "items", "data", "events", "faces", "objects")

_TS_PREFER_V21   = ("event_time", "created_at", "timestamp", "date", "datetime", "time")
_TS_PREFER_V12   = ("date", "timestamp", "created_at", "datetime", "event_time", "time")

# ── Tiny helpers ──────────────────────────────────────────────────────────────

def _first(d: Dict[str, Any], keys: Tuple[str, ...], default: Any = None) -> Any:
    for k in keys:
        v = d.get(k)
        if v is not None:
            return v
    return default


def _safe_float(v: Any) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _safe_int(v: Any) -> Optional[int]:
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _str_or_none(v: Any) -> Optional[str]:
    return str(v) if v is not None else None


# ── 1. Version detection ──────────────────────────────────────────────────────

def detect_version(response: Any, items: List[Any]) -> str:
    """
    Infer FFS version from payload structure. Pure heuristic — no version
    field assumed to exist in the payload.

    FFS 2.1+ signals (any one → "2.1+"):
      • Response envelope contains "total" key without "count"
      • Any sampled event has camera as a dict
      • Any sampled event has "event_time" field
      • Any sampled event has "fps" or "dropped_frames" at the top level
        or nested under camera

    FFS 1.2 signals (all weaker — used only when no 2.1+ signal found):
      • Response envelope has "count", no "total"
      • Sampled events have camera as plain string + "date" field

    Returns "1.2", "2.1+", or "unknown".
    """
    # Response-level: "total" without "count" is a clear 2.1+ indicator
    if isinstance(response, dict):
        if "total" in response and "count" not in response:
            return "2.1+"

    # Event-level: sample up to 5 items
    for item in items[:5]:
        if not isinstance(item, dict):
            continue

        camera = item.get("camera")

        if isinstance(camera, dict):
            return "2.1+"

        if "event_time" in item:
            return "2.1+"

        if "fps" in item or "dropped_frames" in item:
            return "2.1+"

        # Nested fps/dropped_frames under camera dict (unlikely in 1.2 but safe)
        if isinstance(camera, dict) and (
            "fps" in camera or "dropped_frames" in camera
        ):
            return "2.1+"

        # 1.2 signal: string camera + date
        if isinstance(camera, str) and "date" in item and "event_time" not in item:
            return "1.2"

    # Fallback: response-level count field alone
    if isinstance(response, dict) and "count" in response:
        return "1.2"

    return "unknown"


# ── 2. Envelope extraction ────────────────────────────────────────────────────

def extract_envelope(response: Any) -> Tuple[List[Any], Optional[int]]:
    """
    Extract (items_list, total_count) from any envelope shape.
    total_count is None when not present in the response.
    """
    if isinstance(response, list):
        return response, len(response)

    if not isinstance(response, dict):
        return [], None

    total = _safe_int(_first(response, _ENVELOPE_COUNT))

    items = _first(response, _ENVELOPE_ITEMS)
    if not isinstance(items, list):
        items = []

    return items, total


# ── 3. Camera normalization ───────────────────────────────────────────────────

def _normalize_camera_12(camera_raw: Any) -> Optional[Dict[str, Any]]:
    """FFS 1.2: camera is a plain string (name or ID)."""
    if not isinstance(camera_raw, str) or not camera_raw:
        return None
    return {
        "id":      camera_raw,
        "name":    camera_raw,
        "status":  None,
        "active":  None,
        "comment": None,
    }


def _normalize_camera_21(camera_raw: Any) -> Optional[Dict[str, Any]]:
    """
    FFS 2.1+: camera is a dict. Falls back gracefully if it's a bare string
    (some 2.1+ deployments return camera as an ID string in abbreviated events).
    """
    if isinstance(camera_raw, str):
        if not camera_raw:
            return None
        return {"id": camera_raw, "name": camera_raw, "status": None, "active": None, "comment": None}

    if not isinstance(camera_raw, dict):
        return None

    cam_id   = _str_or_none(camera_raw.get("id") or camera_raw.get("uuid") or camera_raw.get("camera_id"))
    cam_name = _str_or_none(
        camera_raw.get("name") or camera_raw.get("title") or camera_raw.get("comment") or cam_id
    )
    status_str = _str_or_none(camera_raw.get("status") or camera_raw.get("state"))
    active_raw = camera_raw.get("active")

    if isinstance(active_raw, bool):
        is_active = active_raw
    elif isinstance(status_str, str):
        is_active = status_str.lower() in ("active", "online", "running", "enabled", "on")
    else:
        is_active = None

    return {
        "id":      cam_id or "",
        "name":    cam_name or cam_id or "",
        "status":  status_str,
        "active":  is_active,
        "comment": _str_or_none(camera_raw.get("comment")),
    }


# ── 4. Camera list (deduplicated) ─────────────────────────────────────────────

def _extract_cameras(items: List[Any], version: str) -> List[Dict[str, Any]]:
    seen: Dict[str, Dict[str, Any]] = {}

    for item in items:
        if not isinstance(item, dict):
            continue
        camera_raw = item.get("camera")
        if camera_raw is None:
            continue

        cam = (
            _normalize_camera_12(camera_raw)
            if version == "1.2"
            else _normalize_camera_21(camera_raw)
        )
        if cam and cam.get("id") and cam["id"] not in seen:
            seen[cam["id"]] = cam

    return list(seen.values())


# ── 5. FPS and dropped-frames metrics ────────────────────────────────────────

def _extract_fps_and_drops(
    items: List[Any], version: str
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Aggregate FPS and dropped-frame counts across sampled events.

    FFS 1.2 never carries these fields — returns all-None immediately.
    FFS 2.1+ may carry fps/dropped_frames on each event item, or nested
    under the camera sub-object.
    """
    _none_fps   = {"avg": None, "min": None, "max": None}
    _none_drops = {"total": None, "per_camera": []}

    if version == "1.2":
        return _none_fps, _none_drops

    fps_values: List[float]       = []
    drops_total: int               = 0
    drops_per_cam: Dict[str, int]  = {}

    for item in items:
        if not isinstance(item, dict):
            continue

        camera = item.get("camera")

        # FPS: check event level, then nested camera dict
        fps_raw = item.get("fps")
        if fps_raw is None and isinstance(camera, dict):
            fps_raw = camera.get("fps")
        if fps_raw is not None:
            v = _safe_float(fps_raw)
            if v is not None:
                fps_values.append(v)

        # Dropped frames: same dual-level check
        drop_raw = item.get("dropped_frames")
        if drop_raw is None and isinstance(camera, dict):
            drop_raw = camera.get("dropped_frames")
        if drop_raw is not None:
            d = _safe_int(drop_raw)
            if d is not None and d > 0:
                drops_total += d
                cam_id = (
                    _str_or_none(camera.get("id") if isinstance(camera, dict) else camera)
                    or "unknown"
                )
                drops_per_cam[cam_id] = drops_per_cam.get(cam_id, 0) + d

    fps_stats: Dict[str, Any] = {
        "avg": round(sum(fps_values) / len(fps_values), 2) if fps_values else None,
        "min": round(min(fps_values), 2) if fps_values else None,
        "max": round(max(fps_values), 2) if fps_values else None,
    }
    drops_stats: Dict[str, Any] = {
        "total": drops_total if (drops_per_cam or drops_total > 0) else None,
        "per_camera": [
            {"camera_id": cid, "count": cnt}
            for cid, cnt in sorted(drops_per_cam.items())
        ],
    }
    return fps_stats, drops_stats


# ── 6. Latest timestamp ───────────────────────────────────────────────────────

def _extract_latest_timestamp(items: List[Any], version: str) -> Optional[str]:
    ts_fields = _TS_PREFER_V21 if version == "2.1+" else _TS_PREFER_V12
    for item in items:
        if not isinstance(item, dict):
            continue
        for field in ts_fields:
            v = item.get(field)
            if v:
                return str(v)
    return None


# ── 7. Health summary ─────────────────────────────────────────────────────────

def _build_health_summary(cameras: List[Dict[str, Any]], version: str) -> Dict[str, Any]:
    total = len(cameras)

    if version == "1.2":
        # Camera status is not available in 1.2 event payloads
        return {
            "cameras_total":          total,
            "cameras_active":         None,
            "cameras_inactive":       None,
            "cameras_status_unknown": None,
        }

    active   = sum(1 for c in cameras if c.get("active") is True)
    inactive = sum(1 for c in cameras if c.get("active") is False)
    unknown  = total - active - inactive

    return {
        "cameras_total":          total,
        "cameras_active":         active,
        "cameras_inactive":       inactive,
        "cameras_status_unknown": unknown if unknown > 0 else None,
    }


# ── Public entry point ────────────────────────────────────────────────────────

def normalize(response: Any) -> Dict[str, Any]:
    """
    Normalize a raw FindFace Security events API response into a stable
    payload regardless of FFS version.

    Safe to call with any response shape — malformed or partial payloads
    produce degraded-but-valid output, never exceptions.
    """
    try:
        items, total_from_meta = extract_envelope(response)
        version                = detect_version(response, items)
        total_events           = total_from_meta if total_from_meta is not None else len(items)
        latest_ts              = _extract_latest_timestamp(items, version)
        cameras                = _extract_cameras(items, version)
        fps_stats, drops_stats = _extract_fps_and_drops(items, version)
        health_summary         = _build_health_summary(cameras, version)

        return {
            "frs_version_detected": version,
            "total_events":         total_events,
            "page_sample_size":     len(items),
            "latest_event_time":    latest_ts,
            "cameras":              cameras,
            "fps":                  fps_stats,
            "dropped_frames":       drops_stats,
            "health_summary":       health_summary,
        }
    except Exception:
        logger.exception("events_normalizer.normalize() raised unexpectedly — returning empty payload")
        return {
            "frs_version_detected": "unknown",
            "total_events":         0,
            "page_sample_size":     0,
            "latest_event_time":    None,
            "cameras":              [],
            "fps":                  {"avg": None, "min": None, "max": None},
            "dropped_frames":       {"total": None, "per_camera": []},
            "health_summary":       {"cameras_total": 0, "cameras_active": None,
                                     "cameras_inactive": None, "cameras_status_unknown": None},
        }
