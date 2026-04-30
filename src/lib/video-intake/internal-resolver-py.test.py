import importlib.util
import pathlib
import sys
import unittest


def _load_module():
    repo_root = pathlib.Path(__file__).resolve().parents[3]
    vendor_python = repo_root / ".vendor" / "python"
    if vendor_python.exists():
        sys.path.insert(0, str(vendor_python))
    module_path = pathlib.Path(__file__).with_name("internal-resolver.py")
    spec = importlib.util.spec_from_file_location("internal_resolver_runtime", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


resolver = _load_module()


class InternalResolverStrategyTest(unittest.TestCase):
    def test_parse_raw_resolver_headers_single_line_cookie(self):
        headers = resolver.parse_raw_resolver_headers("a=1; b=2; c=3")
        self.assertEqual(headers.get("Cookie"), "a=1; b=2; c=3")

    def test_parse_raw_resolver_headers_devtools_style_block(self):
        raw = """cookie
ttwid=demo123; sid_tt=demo456
dnt
1
referer
https://www.tiktok.com/
sec-ch-ua
"Chromium";v="146", "Google Chrome";v="146"
"""
        headers = resolver.parse_raw_resolver_headers(raw)
        self.assertEqual(headers.get("Cookie"), "ttwid=demo123; sid_tt=demo456")
        self.assertEqual(headers.get("DNT"), "1")
        self.assertEqual(headers.get("Referer"), "https://www.tiktok.com/")
        self.assertIn("sec-ch-ua", headers)

    def test_parse_raw_resolver_headers_cookie_prefix_formats(self):
        headers_with_colon = resolver.parse_raw_resolver_headers(
            "Cookie: ttwid=demo; sid_tt=demo2"
        )
        headers_with_equals = resolver.parse_raw_resolver_headers(
            "cookie=ttwid=demo; sid_tt=demo2"
        )
        self.assertEqual(
            headers_with_colon.get("Cookie"), "ttwid=demo; sid_tt=demo2"
        )
        self.assertEqual(
            headers_with_equals.get("Cookie"), "ttwid=demo; sid_tt=demo2"
        )

    def test_detect_extractor_platform(self):
        self.assertEqual(
            resolver.detect_extractor_platform("https://www.tiktok.com/@u/video/1"),
            "tiktok",
        )
        self.assertEqual(
            resolver.detect_extractor_platform("https://www.douyin.com/video/1"),
            "douyin",
        )
        self.assertEqual(
            resolver.detect_extractor_platform("https://www.youtube.com/watch?v=x"),
            "youtube",
        )
        self.assertEqual(
            resolver.detect_extractor_platform("https://www.bilibili.com/video/BV1x"),
            "bilibili",
        )
        self.assertEqual(
            resolver.detect_extractor_platform("https://example.com/demo"),
            "other",
        )

    def test_build_cookie_variants_auto_fallback_for_douyin(self):
        variants = resolver.build_cookie_variants("douyin", None, None)
        names = [name for name, _ in variants]

        self.assertEqual(names[0], "no-cookie")
        self.assertIn("auto-cookie-browser-chrome", names)
        self.assertIn("auto-cookie-browser-chromium", names)
        self.assertIn("auto-cookie-browser-edge", names)
        self.assertIn("auto-cookie-browser-firefox", names)
        self.assertIn("auto-cookie-browser-safari", names)

    def test_build_cookie_variants_keep_no_cookie_first_with_cookie_file(self):
        variants = resolver.build_cookie_variants(
            "tiktok", "/tmp/cookies.txt", None
        )
        names = [name for name, _ in variants]

        self.assertEqual(names[0], "no-cookie")
        self.assertEqual(names[1], "cookie-file")
        self.assertNotIn("auto-cookie-browser-chrome", names)

    def test_build_cookie_variants_ignores_browser_env_for_public_platforms(self):
        variants = resolver.build_cookie_variants("bilibili", None, "chrome")
        self.assertEqual(variants, [("no-cookie", {})])

    def test_build_format_variants_include_merged_audio_video_fallback(self):
        variants = resolver.build_format_variants("best")
        variant_map = dict(variants)

        self.assertEqual(variants[0][0], "single-media")
        self.assertIn("merged-media", variant_map)
        self.assertIn("bv*+ba", variant_map["merged-media"])
        self.assertNotIn("bestvideo", variant_map["merged-media"])

    def test_build_format_variants_accept_custom_selector(self):
        variants = resolver.build_format_variants("720p", "30080+30280")
        self.assertEqual(variants, [("custom-format", "30080+30280")])

    def test_build_extraction_profiles_for_youtube_includes_android(self):
        normalized_url, profiles = resolver.build_extraction_profiles(
            "https://www.youtube.com/watch?v=abc",
            {"format": "best"},
            None,
            None,
        )
        profile_names = [name for name, _ in profiles]

        self.assertEqual(normalized_url, "https://www.youtube.com/watch?v=abc")
        self.assertIn("default:no-cookie", profile_names)
        self.assertIn("youtube-android:no-cookie", profile_names)
        self.assertIn("default:no-cookie:merged-media", profile_names)

    def test_build_extraction_profiles_for_douyin_excludes_youtube_android(self):
        normalized_url, profiles = resolver.build_extraction_profiles(
            "https://www.douyin.com/jingxuan?modal_id=123456789",
            {"quality_preference": "best"},
            None,
            None,
        )
        profile_names = [name for name, _ in profiles]

        self.assertEqual(normalized_url, "https://www.douyin.com/video/123456789")
        self.assertIn("default:auto-cookie-browser-chrome", profile_names)
        self.assertTrue(all("youtube-android" not in name for name in profile_names))

    def test_build_extraction_profiles_for_bilibili_are_public_no_cookie_only(self):
        normalized_url, profiles = resolver.build_extraction_profiles(
            "https://www.bilibili.com/video/BV1W2oSBWEYw/",
            {"quality_preference": "best"},
            "/tmp/cookies.txt",
            "chrome",
        )
        profile_names = [name for name, _ in profiles]

        self.assertEqual(
            normalized_url, "https://www.bilibili.com/video/BV1W2oSBWEYw/"
        )
        self.assertEqual(profile_names[0], "default:no-cookie")
        self.assertIn("default:no-cookie:merged-media", profile_names)
        self.assertTrue(all("cookie-browser" not in name for name in profile_names))
        self.assertTrue(all("cookie-file" not in name for name in profile_names))

    def test_build_payload_marks_requested_formats_as_ytdlp_file_with_audio(self):
        payload = resolver.build_payload(
            {
                "title": "Demo",
                "duration": 10,
                "requested_formats": [
                    {
                        "format_id": "30080",
                        "height": 1080,
                        "width": 1920,
                        "vcodec": "avc1",
                        "acodec": "none",
                        "filesize": 100,
                    },
                    {
                        "format_id": "30280",
                        "vcodec": "none",
                        "acodec": "mp4a",
                        "filesize": 20,
                    },
                ],
            },
            "default:no-cookie:merged-media",
            "bv*+ba/b",
        )

        self.assertIsNone(payload["directMediaUrl"])
        self.assertEqual(payload["downloadMode"], "yt-dlp-file")
        self.assertEqual(payload["formatId"], "30080+30280")
        self.assertTrue(payload["hasAudio"])
        self.assertTrue(payload["hasVideo"])
        self.assertEqual(payload["sizeBytes"], 120)

    def test_build_payload_marks_video_only_direct_format_without_audio(self):
        payload = resolver.build_payload(
            {
                "url": "https://cdn.example.com/video.m4s",
                "format_id": "100026",
                "height": 1080,
                "width": 1920,
                "vcodec": "av01",
                "acodec": "none",
            },
            "default:no-cookie",
            "best",
        )

        self.assertEqual(payload["downloadMode"], "direct-url")
        self.assertFalse(payload["hasAudio"])
        self.assertTrue(payload["hasVideo"])


if __name__ == "__main__":
    unittest.main()
