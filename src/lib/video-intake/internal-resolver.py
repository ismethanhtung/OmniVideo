import json
import os
import sys
from urllib.parse import parse_qs, urlparse, urlunparse
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from yt_dlp import YoutubeDL

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


def build_format_for_quality(quality_preference):
    # This pipeline uploads one media URL. Prefer muxed/progressive streams here;
    # higher DASH-only qualities need a future download+merge path.
    if quality_preference == "1080p":
        return (
            "best[acodec!=none][vcodec!=none][height<=1080][ext=mp4][protocol^=http]/"
            "best[acodec!=none][vcodec!=none][height<=1080][protocol^=http]/"
            "best[height<=1080][protocol^=http]/best[protocol^=http]/best"
        )
    if quality_preference == "720p":
        return (
            "best[acodec!=none][vcodec!=none][height<=720][ext=mp4][protocol^=http]/"
            "best[acodec!=none][vcodec!=none][height<=720][protocol^=http]/"
            "best[height<=720][protocol^=http]/best[protocol^=http]/best"
        )
    if quality_preference == "480p":
        return (
            "best[acodec!=none][vcodec!=none][height<=480][ext=mp4][protocol^=http]/"
            "best[acodec!=none][vcodec!=none][height<=480][protocol^=http]/"
            "best[height<=480][protocol^=http]/best[protocol^=http]/best"
        )
    if quality_preference == "360p":
        return (
            "best[acodec!=none][vcodec!=none][height<=360][ext=mp4][protocol^=http]/"
            "best[acodec!=none][vcodec!=none][height<=360][protocol^=http]/"
            "best[height<=360][protocol^=http]/best[protocol^=http]/best"
        )

    return (
        "best[acodec!=none][vcodec!=none][ext=mp4][protocol^=http]/"
        "best[acodec!=none][vcodec!=none][protocol^=http]/best[protocol^=http]/best"
    )


def build_relaxed_format_for_quality(quality_preference):
    if quality_preference == "1080p":
        return "best[height<=1080]/bestvideo[height<=1080]/best"
    if quality_preference == "720p":
        return "best[height<=720]/bestvideo[height<=720]/best"
    if quality_preference == "480p":
        return "best[height<=480]/bestvideo[height<=480]/best"
    if quality_preference == "360p":
        return "best[height<=360]/bestvideo[height<=360]/best"

    return "best/bestvideo"


def build_format_variants(quality_preference):
    strict_format = build_format_for_quality(quality_preference)
    relaxed_format = build_relaxed_format_for_quality(quality_preference)

    variants = [("single-media", strict_format)]
    if relaxed_format != strict_format:
        variants.append(("relaxed-public", relaxed_format))

    return variants


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


def build_extraction_profiles(url, base_options, cookie_file, cookie_browser):
    normalized_url = normalize_url_for_extractor(url)
    platform = detect_extractor_platform(normalized_url)
    extractor_variants = build_extractor_variants(platform)
    cookie_variants = build_cookie_variants(platform, cookie_file, cookie_browser)
    format_variants = build_format_variants(base_options.get("quality_preference", "best"))

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


def build_payload(info):
    direct_url = info.get("url")
    if not direct_url:
        raise RuntimeError("yt-dlp did not return a direct media URL.")

    return {
        "directMediaUrl": direct_url,
        "title": info.get("title"),
        "mimeType": info.get("mime_type"),
        "sizeBytes": info.get("filesize") or info.get("filesize_approx"),
        "durationMs": int(info["duration"] * 1000) if info.get("duration") else None,
        "formatId": info.get("format_id"),
        "formatNote": info.get("format_note"),
        "height": info.get("height"),
        "width": info.get("width"),
        "resolution": info.get("resolution"),
        "ext": info.get("ext"),
        "vcodec": info.get("vcodec"),
        "acodec": info.get("acodec"),
        "requestHeaders": info.get("http_headers") or None,
    }


def extract_with_options(url, options):
    with YoutubeDL(options) as ydl:
        return ydl.extract_info(url, download=False)


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


def resolve_info(url, quality_preference):
    cookie_file = os.environ.get("VIDEO_RESOLVER_COOKIES_FILE")
    cookie_browser = os.environ.get("VIDEO_RESOLVER_COOKIES_FROM_BROWSER")
    normalized_url = normalize_url_for_extractor(url)
    platform = detect_extractor_platform(normalized_url)
    raw_headers = (
        read_resolver_headers_from_env()
        if platform in COOKIE_FALLBACK_PLATFORMS
        else {}
    )
    base_options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "quality_preference": quality_preference,
    }
    if raw_headers:
        base_options["http_headers"] = raw_headers

    normalized_url, extraction_profiles = build_extraction_profiles(
        normalized_url, base_options, cookie_file, cookie_browser
    )

    errors = []

    for profile_name, options in extraction_profiles:
        try:
            info = extract_with_options(normalized_url, options)
            payload = build_payload(info)
        except Exception as error:
            candidate_error = f"{profile_name}: extract_failed: {error}"
            if candidate_error not in errors:
                errors.append(candidate_error)
            continue

        if is_fetchable_direct_url(
            payload.get("directMediaUrl"), payload.get("requestHeaders")
        ):
            return payload

        candidate_error = f"{profile_name}: direct_url_not_fetchable"
        if candidate_error not in errors:
            errors.append(candidate_error)

    details = " | ".join(errors) if errors else "no resolver profile was executed"
    raise RuntimeError(f"Could not resolve a fetchable direct media URL. {details}")


def main():
    if len(sys.argv) < 2:
        raise RuntimeError("Missing URL argument.")

    url = sys.argv[1]
    quality_preference = "best"
    if len(sys.argv) >= 3:
        quality_preference = str(sys.argv[2]).strip().lower()

    if quality_preference not in SUPPORTED_QUALITY:
        raise RuntimeError(
            "Invalid quality preference. Expected one of: best, 1080p, 720p, 480p, 360p."
        )

    payload = resolve_info(url, quality_preference)
    print(json.dumps(payload))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
