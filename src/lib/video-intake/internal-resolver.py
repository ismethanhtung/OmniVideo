import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from yt_dlp import YoutubeDL

SUPPORTED_QUALITY = {"best", "1080p", "720p", "480p", "360p"}


def build_format_for_quality(quality_preference):
    if quality_preference == "1080p":
        return (
            "bestvideo[height<=1080][protocol^=http]+bestaudio[protocol^=http]/"
            "best[height<=1080][protocol^=http]/best[protocol^=http]/best"
        )
    if quality_preference == "720p":
        return (
            "bestvideo[height<=720][protocol^=http]+bestaudio[protocol^=http]/"
            "best[height<=720][protocol^=http]/best[protocol^=http]/best"
        )
    if quality_preference == "480p":
        return (
            "bestvideo[height<=480][protocol^=http]+bestaudio[protocol^=http]/"
            "best[height<=480][protocol^=http]/best[protocol^=http]/best"
        )
    if quality_preference == "360p":
        return (
            "bestvideo[height<=360][protocol^=http]+bestaudio[protocol^=http]/"
            "best[height<=360][protocol^=http]/best[protocol^=http]/best"
        )

    return "best[ext=mp4][protocol^=http]/best[protocol^=http]/best"


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
    base_options = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "format": build_format_for_quality(quality_preference),
    }

    extraction_profiles = [
        ("default", base_options),
        (
            "youtube-android",
            {
                **base_options,
                "extractor_args": {"youtube": {"player_client": ["android"]}},
            },
        ),
    ]

    errors = []

    for profile_name, options in extraction_profiles:
        try:
            info = extract_with_options(url, options)
            payload = build_payload(info)
        except Exception as error:
            errors.append(f"{profile_name}: extract_failed: {error}")
            continue

        if is_fetchable_direct_url(
            payload.get("directMediaUrl"), payload.get("requestHeaders")
        ):
            return payload

        errors.append(f"{profile_name}: direct_url_not_fetchable")

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
