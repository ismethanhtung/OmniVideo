import json
import mimetypes
import os
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse, urlunparse
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from yt_dlp import YoutubeDL
from yt_dlp.extractor.bilibili import BiliBiliIE

SUPPORTED_QUALITY = {"best", "1080p", "720p", "480p", "360p"}
SUPPORTED_COOKIE_BROWSERS = {"chrome", "chromium", "edge", "firefox", "safari"}
AUTO_COOKIE_BROWSERS = ("chrome", "chromium", "edge", "firefox", "safari")
COOKIE_FALLBACK_PLATFORMS = {"tiktok", "douyin"}
RESOLVER_RAW_HEADERS_ENV_KEYS = (
    "VIDEO_RESOLVER_COOKIES_HEADER",
    "VIDEO_RESOLVER_COOKIE_HEADER",
)
KNOWN_RESOLVER_HEADER_NAMES = {
    "cookie",
    "referer",
    "origin",
    "user-agent",
    "accept",
    "accept-language",
    "dnt",
    "priority",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
}
BILIBILI_HTML5_SELECTOR_PREFIX = "bilibili-html5-"
BILIBILI_HTML5_QUALITY_HEIGHTS = {
    80: 1080,
    64: 720,
    32: 480,
    16: 360,
}


def build_height_filter(quality_preference):
    if quality_preference == "1080p":
        return "[height<=1080]"
    if quality_preference == "720p":
        return "[height<=720]"
    if quality_preference == "480p":
        return "[height<=480]"
    if quality_preference == "360p":
        return "[height<=360]"
    return ""


def build_progressive_format_for_quality(quality_preference):
    height_filter = build_height_filter(quality_preference)
    av_filter = f"[acodec!=none][vcodec!=none]{height_filter}"
    return (
        f"best{av_filter}[ext=mp4][protocol^=http]/"
        f"best{av_filter}[protocol^=http]/"
        f"best{av_filter}"
    )


def build_merged_format_for_quality(quality_preference):
    height_filter = build_height_filter(quality_preference)
    return (
        f"bv*{height_filter}+ba/"
        f"b[acodec!=none][vcodec!=none]{height_filter}/"
        f"best[acodec!=none][vcodec!=none]{height_filter}"
    )


def build_format_variants(quality_preference, format_selector=None):
    if format_selector:
        return [("custom-format", format_selector)]

    progressive_format = build_progressive_format_for_quality(quality_preference)
    merged_format = build_merged_format_for_quality(quality_preference)
    variants = [("merged-media", merged_format)]
    if merged_format != progressive_format:
        variants.append(("single-media", progressive_format))
    return variants


def extract_bilibili_bvid(url):
    parsed = urlparse(url)
    path_match = re.search(r"/video/(?P<bvid>[Bb][Vv][^/?#&]+)", parsed.path)
    if path_match:
        return path_match.group("bvid")

    query = parse_qs(parsed.query)
    festival_bvid = query.get("bvid", [None])[0]
    if festival_bvid and festival_bvid[:2].lower() == "bv":
        return festival_bvid

    return None


def build_bilibili_html5_selector(quality):
    return f"{BILIBILI_HTML5_SELECTOR_PREFIX}{quality}"


def parse_bilibili_html5_selector(format_selector):
    if not format_selector or not format_selector.startswith(
        BILIBILI_HTML5_SELECTOR_PREFIX
    ):
        return None

    raw_quality = format_selector.removeprefix(BILIBILI_HTML5_SELECTOR_PREFIX)
    try:
        quality = int(raw_quality)
    except ValueError:
        return None

    return quality if quality in BILIBILI_HTML5_QUALITY_HEIGHTS else None


def is_bilibili_html5_selector(format_selector):
    return parse_bilibili_html5_selector(format_selector) is not None


def build_bilibili_html5_quality_candidates(quality_preference):
    if quality_preference in {"best", "1080p"}:
        return [80]
    return []


def build_bilibili_html5_payload(
    play_info,
    *,
    source_url,
    title=None,
    duration_seconds=None,
):
    quality = play_info.get("quality")
    height = BILIBILI_HTML5_QUALITY_HEIGHTS.get(quality)
    durl_items = play_info.get("durl") or []
    first_durl = durl_items[0] if durl_items else None
    direct_url = first_durl.get("url") if first_durl else None

    if not quality or not height or not direct_url:
        return None

    return {
        "directMediaUrl": direct_url,
        "downloadMode": "direct-url",
        "resolverProfile": "bilibili-html5:no-cookie",
        "formatSelector": build_bilibili_html5_selector(quality),
        "hasAudio": True,
        "hasVideo": True,
        "title": title,
        "mimeType": "video/mp4",
        "sizeBytes": first_durl.get("size"),
        "durationMs": int(duration_seconds * 1000) if duration_seconds else None,
        "formatId": build_bilibili_html5_selector(quality),
        "formatNote": f"html5 {height}p progressive",
        "height": height,
        "width": None,
        "resolution": None,
        "ext": play_info.get("format") or "mp4",
        "vcodec": None,
        "acodec": None,
        "requestHeaders": {
            "Referer": source_url,
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
    }


def fetch_bilibili_view_data(bvid):
    request = Request(
        f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}",
        headers={
            "Referer": "https://www.bilibili.com/",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
    )
    with urlopen(request, timeout=20) as response:
        payload = json.load(response)

    if payload.get("code") != 0 or not isinstance(payload.get("data"), dict):
        raise RuntimeError("Bilibili view API did not return video metadata.")

    return payload["data"]


def fetch_bilibili_html5_playinfo(bvid, cid, source_url, quality):
    with YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
        extractor = BiliBiliIE(ydl)
        return extractor._download_playinfo(
            bvid,
            cid,
            headers={"Referer": source_url},
            query={"platform": "html5", "qn": quality},
        )


def resolve_bilibili_html5_payload(url, quality_preference, forced_quality=None):
    bvid = extract_bilibili_bvid(url)
    if not bvid:
        return None

    candidate_qualities = (
        [forced_quality]
        if forced_quality is not None
        else build_bilibili_html5_quality_candidates(quality_preference)
    )
    if not candidate_qualities:
        return None

    view_data = fetch_bilibili_view_data(bvid)
    cid = view_data.get("cid")
    if not cid:
        return None

    for quality in candidate_qualities:
        play_info = fetch_bilibili_html5_playinfo(bvid, cid, url, quality)
        payload = build_bilibili_html5_payload(
            play_info,
            source_url=url,
            title=view_data.get("title"),
            duration_seconds=view_data.get("duration"),
        )
        if payload and payload["height"] == BILIBILI_HTML5_QUALITY_HEIGHTS[quality]:
            return payload

    return None


def list_bilibili_html5_formats(url):
    bvid = extract_bilibili_bvid(url)
    if not bvid:
        return []

    view_data = fetch_bilibili_view_data(bvid)
    cid = view_data.get("cid")
    if not cid:
        return []

    initial_play_info = fetch_bilibili_html5_playinfo(bvid, cid, url, 80)
    available_qualities = initial_play_info.get("accept_quality") or []
    formats = []

    for quality in available_qualities:
        if quality not in BILIBILI_HTML5_QUALITY_HEIGHTS:
            continue
        play_info = (
            initial_play_info
            if initial_play_info.get("quality") == quality
            else fetch_bilibili_html5_playinfo(bvid, cid, url, quality)
        )
        payload = build_bilibili_html5_payload(
            play_info,
            source_url=url,
            title=view_data.get("title"),
            duration_seconds=view_data.get("duration"),
        )
        if not payload or payload["height"] != BILIBILI_HTML5_QUALITY_HEIGHTS[quality]:
            continue
        formats.append(
            {
                "formatId": payload["formatId"],
                "ext": payload["ext"],
                "formatNote": payload["formatNote"],
                "resolution": payload["resolution"],
                "width": payload["width"],
                "height": payload["height"],
                "fps": None,
                "filesize": payload["sizeBytes"],
                "filesizeApprox": None,
                "protocol": "https",
                "tbr": None,
                "vbr": None,
                "abr": None,
                "vcodec": payload["vcodec"],
                "acodec": payload["acodec"],
                "hasAudio": True,
                "hasVideo": True,
            }
        )

    return formats


def normalize_url_for_extractor(url):
    parsed = urlparse(url)

    if parsed.netloc.endswith("douyin.com"):
        query = parse_qs(parsed.query)
        modal_id = query.get("modal_id", [None])[0]

        if modal_id:
            return urlunparse(
                (
                    parsed.scheme or "https",
                    parsed.netloc,
                    f"/video/{modal_id}",
                    "",
                    "",
                    "",
                )
            )

    return url


def detect_extractor_platform(url):
    parsed = urlparse(url)
    hostname = (parsed.netloc or "").lower()

    if hostname == "youtu.be" or hostname.endswith("youtube.com"):
        return "youtube"
    if hostname.endswith("tiktok.com"):
        return "tiktok"
    if hostname.endswith("douyin.com"):
        return "douyin"
    if hostname.endswith("bilibili.com"):
        return "bilibili"

    return "other"


def build_extractor_variants(platform):
    variants = [("default", {})]

    if platform == "youtube":
        variants.append(
            (
                "youtube-android",
                {"extractor_args": {"youtube": {"player_client": ["android"]}}},
            )
        )

    return variants


def normalize_cookie_header_value(value):
    if not isinstance(value, str):
        return ""

    trimmed = value.strip()
    lowered = trimmed.lower()

    if lowered.startswith("cookie:"):
        return trimmed.split(":", 1)[1].strip()

    if lowered.startswith("cookie="):
        return trimmed.split("=", 1)[1].strip()

    return trimmed


def normalize_resolver_header_name(name):
    normalized = str(name or "").strip().lower()

    if normalized == "cookie":
        return "Cookie"
    if normalized == "referer":
        return "Referer"
    if normalized == "origin":
        return "Origin"
    if normalized == "user-agent":
        return "User-Agent"
    if normalized == "accept":
        return "Accept"
    if normalized == "accept-language":
        return "Accept-Language"
    if normalized == "dnt":
        return "DNT"

    return normalized


def parse_raw_resolver_headers(raw_text):
    if not raw_text or not isinstance(raw_text, str):
        return {}

    raw = raw_text.strip()
    if not raw:
        return {}

    headers = {}

    # Single-line cookie value copied directly.
    if "\n" not in raw and ":" not in raw and "=" in raw and ";" in raw:
        cookie_value = normalize_cookie_header_value(raw)
        if cookie_value:
            headers["Cookie"] = cookie_value
        return headers

    lines = [line.strip() for line in raw.replace("\r", "\n").split("\n") if line.strip()]
    if not lines:
        return {}

    # Chromium DevTools "Name / Value" style: alternating key and value lines.
    if (
        len(lines) >= 2
        and ":" not in lines[0]
        and "=" not in lines[0]
        and lines[0].lower() in KNOWN_RESOLVER_HEADER_NAMES
    ):
        for index in range(0, len(lines) - 1, 2):
            key = lines[index].strip().lower()
            value = lines[index + 1].strip()
            if key not in KNOWN_RESOLVER_HEADER_NAMES:
                continue
            header_name = normalize_resolver_header_name(key)
            if header_name == "Cookie":
                value = normalize_cookie_header_value(value)
            if value:
                headers[header_name] = value
        return headers

    # HTTP-style lines: "Header-Name: value" or "header=value"
    for line in lines:
        key = None
        value = None
        if ":" in line:
            key, value = line.split(":", 1)
        elif "=" in line:
            possible_key, possible_value = line.split("=", 1)
            if possible_key.strip().lower() in KNOWN_RESOLVER_HEADER_NAMES:
                key, value = possible_key, possible_value

        if not key or value is None:
            continue

        header_name = normalize_resolver_header_name(key)
        if header_name == "Cookie":
            value = normalize_cookie_header_value(value)
        value = value.strip()
        if value:
            headers[header_name] = value

    # Fallback: best-effort detect cookie text.
    if "Cookie" not in headers and "=" in raw and ";" in raw:
        cookie_value = normalize_cookie_header_value(raw)
        if cookie_value:
            headers["Cookie"] = cookie_value

    return headers


def read_resolver_headers_from_env():
    for env_key in RESOLVER_RAW_HEADERS_ENV_KEYS:
        raw_value = os.environ.get(env_key)
        headers = parse_raw_resolver_headers(raw_value)
        if headers:
            return headers
    return {}


def build_cookie_variants(platform, cookie_file, cookie_browser):
    variants = [("no-cookie", {})]
    if platform not in COOKIE_FALLBACK_PLATFORMS:
        return variants

    has_valid_cookie_browser = (
        bool(cookie_browser) and cookie_browser in SUPPORTED_COOKIE_BROWSERS
    )

    if cookie_file:
        variants.append(("cookie-file", {"cookiefile": cookie_file}))
    if has_valid_cookie_browser:
        variants.append(
            (
                f"cookie-browser-{cookie_browser}",
                {"cookiesfrombrowser": (cookie_browser,)},
            )
        )

    if platform in {"tiktok", "douyin"} and not cookie_file and not has_valid_cookie_browser:
        for browser in AUTO_COOKIE_BROWSERS:
            variants.append(
                (
                    f"auto-cookie-browser-{browser}",
                    {"cookiesfrombrowser": (browser,)},
                )
            )

    return variants


def merge_options(base_options, override_options):
    merged = {**base_options}

    for key, value in override_options.items():
        if key == "extractor_args" and isinstance(value, dict):
            existing = merged.get("extractor_args") or {}
            merged["extractor_args"] = {**existing, **value}
            continue

        merged[key] = value

    return merged


def resolve_ffmpeg_location():
    configured = (
        os.environ.get("VIDEO_RESOLVER_FFMPEG_LOCATION")
        or os.environ.get("FFMPEG_LOCATION")
    )
    candidates = [
        configured,
        os.path.join(os.getcwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
        "ffmpeg",
    ]

    for candidate in candidates:
        if not candidate:
            continue
        if candidate == "ffmpeg":
            return candidate if shutil.which(candidate) else None
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate

    return None


def build_base_options(platform, quality_preference, skip_download=True):
    raw_headers = (
        read_resolver_headers_from_env()
        if platform in COOKIE_FALLBACK_PLATFORMS
        else {}
    )
    base_options = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "skip_download": skip_download,
        "noplaylist": True,
        "quality_preference": quality_preference,
        "retries": 3,
        "fragment_retries": 3,
    }
    ffmpeg_location = resolve_ffmpeg_location()
    if ffmpeg_location:
        base_options["ffmpeg_location"] = ffmpeg_location
    if raw_headers:
        base_options["http_headers"] = raw_headers
    return base_options


def build_extraction_profiles(
    url, base_options, cookie_file, cookie_browser, format_selector=None
):
    normalized_url = normalize_url_for_extractor(url)
    platform = detect_extractor_platform(normalized_url)
    extractor_variants = build_extractor_variants(platform)
    cookie_variants = build_cookie_variants(platform, cookie_file, cookie_browser)
    format_variants = build_format_variants(
        base_options.get("quality_preference", "best"), format_selector
    )

    profiles = []

    for extractor_name, extractor_options in extractor_variants:
        for cookie_name, cookie_options in cookie_variants:
            for format_name, format_selector in format_variants:
                profile_name = f"{extractor_name}:{cookie_name}"
                if format_name != "single-media":
                    profile_name = f"{profile_name}:{format_name}"
                options = merge_options(
                    merge_options(base_options, extractor_options), cookie_options
                )
                options["format"] = format_selector
                options.pop("quality_preference", None)
                profiles.append((profile_name, options))

    return normalized_url, profiles


def codec_is_present(value):
    return bool(value) and value != "none"


def summarize_selected_formats(info):
    requested_formats = info.get("requested_formats") or []
    selected_formats = requested_formats if requested_formats else [info]

    has_audio = any(codec_is_present(item.get("acodec")) for item in selected_formats)
    has_video = any(codec_is_present(item.get("vcodec")) for item in selected_formats)
    size_values = [
        item.get("filesize") or item.get("filesize_approx")
        for item in selected_formats
        if item.get("filesize") or item.get("filesize_approx")
    ]
    width_values = [item.get("width") for item in selected_formats if item.get("width")]
    height_values = [item.get("height") for item in selected_formats if item.get("height")]
    vcodecs = [
        item.get("vcodec")
        for item in selected_formats
        if codec_is_present(item.get("vcodec"))
    ]
    acodecs = [
        item.get("acodec")
        for item in selected_formats
        if codec_is_present(item.get("acodec"))
    ]

    return {
        "format_id": "+".join(
            str(item.get("format_id"))
            for item in selected_formats
            if item.get("format_id") is not None
        )
        or info.get("format_id"),
        "format_note": " + ".join(
            str(item.get("format_note"))
            for item in selected_formats
            if item.get("format_note")
        )
        or info.get("format_note"),
        "has_audio": has_audio,
        "has_video": has_video,
        "size_bytes": sum(size_values) if size_values else None,
        "width": max(width_values) if width_values else info.get("width"),
        "height": max(height_values) if height_values else info.get("height"),
        "vcodec": "+".join(dict.fromkeys(vcodecs)) or info.get("vcodec"),
        "acodec": "+".join(dict.fromkeys(acodecs)) or info.get("acodec"),
        "is_multi_stream": bool(requested_formats),
    }


def build_payload(info, profile_name, format_selector):
    direct_url = info.get("url")
    selected = summarize_selected_formats(info)
    download_mode = (
        "yt-dlp-file" if selected["is_multi_stream"] or not direct_url else "direct-url"
    )

    return {
        "directMediaUrl": direct_url if download_mode == "direct-url" else None,
        "downloadMode": download_mode,
        "resolverProfile": profile_name,
        "formatSelector": format_selector,
        "hasAudio": selected["has_audio"],
        "hasVideo": selected["has_video"],
        "title": info.get("title"),
        "mimeType": info.get("mime_type"),
        "sizeBytes": selected["size_bytes"]
        or info.get("filesize")
        or info.get("filesize_approx"),
        "durationMs": int(info["duration"] * 1000) if info.get("duration") else None,
        "formatId": selected["format_id"],
        "formatNote": selected["format_note"],
        "height": selected["height"],
        "width": selected["width"],
        "resolution": info.get("resolution"),
        "ext": info.get("ext"),
        "vcodec": selected["vcodec"],
        "acodec": selected["acodec"],
        "requestHeaders": info.get("http_headers") or None,
    }


def summarize_format(format_info):
    acodec = format_info.get("acodec")
    vcodec = format_info.get("vcodec")
    return {
        "formatId": str(format_info.get("format_id") or ""),
        "ext": format_info.get("ext"),
        "formatNote": format_info.get("format_note"),
        "resolution": format_info.get("resolution"),
        "width": format_info.get("width"),
        "height": format_info.get("height"),
        "fps": format_info.get("fps"),
        "filesize": format_info.get("filesize"),
        "filesizeApprox": format_info.get("filesize_approx"),
        "protocol": format_info.get("protocol"),
        "tbr": format_info.get("tbr"),
        "vbr": format_info.get("vbr"),
        "abr": format_info.get("abr"),
        "vcodec": vcodec,
        "acodec": acodec,
        "hasAudio": codec_is_present(acodec),
        "hasVideo": codec_is_present(vcodec),
    }


def extract_with_options(url, options):
    with YoutubeDL(options) as ydl:
        return ydl.extract_info(url, download=not options.get("skip_download", True))


def is_fetchable_direct_url(direct_url, request_headers):
    if not direct_url:
        return False

    headers = {}
    if request_headers:
        for key, value in request_headers.items():
            if isinstance(key, str) and isinstance(value, str):
                headers[key] = value

    normalized_header_keys = {key.lower() for key in headers}

    if "user-agent" not in normalized_header_keys:
        headers["User-Agent"] = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )

    if "accept" not in normalized_header_keys:
        headers["Accept"] = "video/*,*/*;q=0.8"

    if "accept-language" not in normalized_header_keys:
        headers["Accept-Language"] = "en-US,en;q=0.9,vi;q=0.8"

    if "referer" not in normalized_header_keys:
        headers["Referer"] = direct_url

    if "range" not in normalized_header_keys:
        headers["Range"] = "bytes=0-1"

    request = Request(direct_url, headers=headers, method="GET")

    try:
        with urlopen(request, timeout=20) as response:
            status = response.getcode() or 0
            return 200 <= status < 400
    except HTTPError as error:
        return False
    except Exception:
        return False


def resolve_info(url, quality_preference, format_selector=None):
    cookie_file = os.environ.get("VIDEO_RESOLVER_COOKIES_FILE")
    cookie_browser = os.environ.get("VIDEO_RESOLVER_COOKIES_FROM_BROWSER")
    normalized_url = normalize_url_for_extractor(url)
    platform = detect_extractor_platform(normalized_url)
    forced_html5_quality = parse_bilibili_html5_selector(format_selector)
    if platform == "bilibili" and (
        forced_html5_quality is not None or not format_selector
    ):
        try:
            html5_payload = resolve_bilibili_html5_payload(
                normalized_url,
                quality_preference,
                forced_quality=forced_html5_quality,
            )
        except Exception:
            html5_payload = None
        if html5_payload:
            return html5_payload

    base_options = build_base_options(platform, quality_preference, skip_download=True)
    normalized_url, extraction_profiles = build_extraction_profiles(
        normalized_url, base_options, cookie_file, cookie_browser, format_selector
    )

    errors = []

    for profile_name, options in extraction_profiles:
        try:
            info = extract_with_options(normalized_url, options)
            payload = build_payload(info, profile_name, options.get("format"))
        except Exception as error:
            candidate_error = f"{profile_name}: extract_failed: {error}"
            if candidate_error not in errors:
                errors.append(candidate_error)
            continue

        if (
            not format_selector
            and payload.get("hasVideo")
            and not payload.get("hasAudio")
        ):
            candidate_error = f"{profile_name}: selected_format_has_no_audio"
            if candidate_error not in errors:
                errors.append(candidate_error)
            continue

        if payload.get("downloadMode") == "yt-dlp-file":
            return payload

        if is_fetchable_direct_url(
            payload.get("directMediaUrl"), payload.get("requestHeaders")
        ):
            return payload

        candidate_error = f"{profile_name}: direct_url_not_fetchable"
        if candidate_error not in errors:
            errors.append(candidate_error)

    details = " | ".join(errors) if errors else "no resolver profile was executed"
    raise RuntimeError(f"Could not resolve a fetchable direct media URL. {details}")


def list_formats(url, quality_preference):
    cookie_file = os.environ.get("VIDEO_RESOLVER_COOKIES_FILE")
    cookie_browser = os.environ.get("VIDEO_RESOLVER_COOKIES_FROM_BROWSER")
    normalized_url = normalize_url_for_extractor(url)
    platform = detect_extractor_platform(normalized_url)
    base_options = build_base_options(platform, quality_preference, skip_download=True)
    base_options.pop("quality_preference", None)
    normalized_url, extraction_profiles = build_extraction_profiles(
        normalized_url, base_options, cookie_file, cookie_browser, None
    )
    errors = []

    for profile_name, options in extraction_profiles:
        options = dict(options)
        options.pop("format", None)
        try:
            info = extract_with_options(normalized_url, options)
            formats = [
                summarize_format(item)
                for item in info.get("formats", [])
                if item.get("format_id")
            ]
            html5_formats = []
            if platform == "bilibili":
                try:
                    html5_formats = list_bilibili_html5_formats(normalized_url)
                except Exception:
                    html5_formats = []
            highest_html5 = max(
                html5_formats,
                key=lambda item: item.get("height") or 0,
                default=None,
            )
            highest_default = max(
                formats,
                key=lambda item: item.get("height") or 0,
                default=None,
            )
            recommended_selector = build_merged_format_for_quality(
                quality_preference
            )
            if (
                highest_html5
                and (highest_html5.get("height") or 0)
                > (highest_default.get("height") or 0)
            ):
                recommended_selector = highest_html5["formatId"]
            return {
                "sourceUrl": normalized_url,
                "title": info.get("title"),
                "durationMs": int(info["duration"] * 1000)
                if info.get("duration")
                else None,
                "originPlatform": platform,
                "resolverProfile": profile_name,
                "recommendedFormatSelector": recommended_selector,
                "formats": formats + html5_formats,
            }
        except Exception as error:
            candidate_error = f"{profile_name}: list_failed: {error}"
            if candidate_error not in errors:
                errors.append(candidate_error)

    details = " | ".join(errors) if errors else "no resolver profile was executed"
    raise RuntimeError(f"Could not list yt-dlp formats. {details}")


def find_downloaded_file(output_dir):
    candidates = []
    for path in Path(output_dir).glob("*"):
        if not path.is_file():
            continue
        if path.name.endswith(".part") or path.name.endswith(".ytdl"):
            continue
        candidates.append(path)

    if not candidates:
        raise RuntimeError("yt-dlp did not produce an output file.")

    return max(candidates, key=lambda item: item.stat().st_size)


def download_bilibili_html5_to_file(url, quality_preference, format_selector, output_dir):
    forced_quality = parse_bilibili_html5_selector(format_selector)
    if forced_quality is None:
        raise RuntimeError("Invalid Bilibili HTML5 format selector.")

    payload = resolve_bilibili_html5_payload(
        normalize_url_for_extractor(url),
        quality_preference,
        forced_quality=forced_quality,
    )
    if not payload or not payload.get("directMediaUrl"):
        raise RuntimeError("Could not resolve Bilibili HTML5 media URL.")

    options = build_base_options("other", quality_preference, skip_download=False)
    options.update(
        {
            "http_headers": payload.get("requestHeaders") or {},
            "merge_output_format": "mp4",
            "outtmpl": os.path.join(output_dir, "%(title).200B-%(id)s.%(ext)s"),
            "windowsfilenames": True,
            "continuedl": True,
            "retries": 10,
            "fragment_retries": 10,
        }
    )

    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(payload["directMediaUrl"], download=True)

    file_path = find_downloaded_file(output_dir)
    mime_type = mimetypes.guess_type(str(file_path))[0] or payload.get("mimeType")

    return {
        "filePath": str(file_path),
        "filename": file_path.name,
        "mimeType": mime_type or "video/mp4",
        "sizeBytes": file_path.stat().st_size,
        "title": payload.get("title") or info.get("title"),
        "durationMs": payload.get("durationMs"),
        "formatId": payload.get("formatId"),
        "formatSelector": payload.get("formatSelector"),
        "resolverProfile": payload.get("resolverProfile"),
        "hasAudio": payload.get("hasAudio"),
        "hasVideo": payload.get("hasVideo"),
    }


def download_to_file(url, quality_preference, format_selector, output_dir):
    cookie_file = os.environ.get("VIDEO_RESOLVER_COOKIES_FILE")
    cookie_browser = os.environ.get("VIDEO_RESOLVER_COOKIES_FROM_BROWSER")
    normalized_url = normalize_url_for_extractor(url)
    platform = detect_extractor_platform(normalized_url)
    selector = format_selector or build_merged_format_for_quality(quality_preference)

    if platform == "bilibili" and is_bilibili_html5_selector(selector):
        return download_bilibili_html5_to_file(
            normalized_url,
            quality_preference,
            selector,
            output_dir,
        )

    base_options = build_base_options(platform, quality_preference, skip_download=False)
    base_options.update(
        {
            "format": selector,
            "merge_output_format": "mp4",
            "outtmpl": os.path.join(output_dir, "%(title).200B-%(id)s.%(ext)s"),
            "windowsfilenames": True,
        }
    )
    normalized_url, extraction_profiles = build_extraction_profiles(
        normalized_url, base_options, cookie_file, cookie_browser, selector
    )
    errors = []

    for profile_name, options in extraction_profiles:
        try:
            info = extract_with_options(normalized_url, options)
            file_path = find_downloaded_file(output_dir)
            mime_type = mimetypes.guess_type(str(file_path))[0] or info.get(
                "mime_type"
            )
            selected = summarize_selected_formats(info)
            return {
                "filePath": str(file_path),
                "filename": file_path.name,
                "mimeType": mime_type or "video/mp4",
                "sizeBytes": file_path.stat().st_size,
                "title": info.get("title"),
                "durationMs": int(info["duration"] * 1000)
                if info.get("duration")
                else None,
                "formatId": selected["format_id"],
                "formatSelector": options.get("format"),
                "resolverProfile": profile_name,
                "hasAudio": selected["has_audio"],
                "hasVideo": selected["has_video"],
            }
        except Exception as error:
            candidate_error = f"{profile_name}: download_failed: {error}"
            if candidate_error not in errors:
                errors.append(candidate_error)

    details = " | ".join(errors) if errors else "no resolver profile was executed"
    raise RuntimeError(f"yt-dlp download failed. {details}")


def main():
    if len(sys.argv) < 2:
        raise RuntimeError("Missing URL argument.")

    command = "resolve"
    arg_offset = 1
    if sys.argv[1] in {"resolve", "formats", "download"}:
        command = sys.argv[1]
        arg_offset = 2

    if len(sys.argv) <= arg_offset:
        raise RuntimeError("Missing URL argument.")

    url = sys.argv[arg_offset]
    quality_preference = "best"
    if len(sys.argv) > arg_offset + 1:
        quality_preference = str(sys.argv[arg_offset + 1]).strip().lower()

    if quality_preference not in SUPPORTED_QUALITY:
        raise RuntimeError(
            "Invalid quality preference. Expected one of: best, 1080p, 720p, 480p, 360p."
        )

    if command == "formats":
        payload = list_formats(url, quality_preference)
    elif command == "download":
        format_selector = ""
        output_dir = ""
        if len(sys.argv) > arg_offset + 2:
            format_selector = str(sys.argv[arg_offset + 2]).strip()
        if len(sys.argv) > arg_offset + 3:
            output_dir = str(sys.argv[arg_offset + 3]).strip()
        if not output_dir:
            raise RuntimeError("Missing output directory argument.")
        payload = download_to_file(url, quality_preference, format_selector, output_dir)
    else:
        format_selector = ""
        if len(sys.argv) > arg_offset + 2:
            format_selector = str(sys.argv[arg_offset + 2]).strip()
        payload = resolve_info(url, quality_preference, format_selector or None)
    print(json.dumps(payload))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
