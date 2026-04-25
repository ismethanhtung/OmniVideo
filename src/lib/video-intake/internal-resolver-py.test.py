import importlib.util
import pathlib
import unittest


def _load_module():
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
            resolver.detect_extractor_platform("https://example.com/demo"),
            "other",
        )

    def test_build_cookie_variants_auto_fallback_for_douyin(self):
        variants = resolver.build_cookie_variants("douyin", None, None)
        names = [name for name, _ in variants]

        self.assertIn("no-cookie", names)
        self.assertIn("auto-cookie-browser-chrome", names)
        self.assertIn("auto-cookie-browser-chromium", names)
        self.assertIn("auto-cookie-browser-edge", names)
        self.assertIn("auto-cookie-browser-firefox", names)
        self.assertIn("auto-cookie-browser-safari", names)

    def test_build_cookie_variants_prioritize_cookie_file(self):
        variants = resolver.build_cookie_variants(
            "tiktok", "/tmp/cookies.txt", None
        )
        names = [name for name, _ in variants]

        self.assertEqual(names[0], "cookie-file")
        self.assertIn("no-cookie", names)
        self.assertNotIn("auto-cookie-browser-chrome", names)

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

    def test_build_extraction_profiles_for_douyin_excludes_youtube_android(self):
        normalized_url, profiles = resolver.build_extraction_profiles(
            "https://www.douyin.com/jingxuan?modal_id=123456789",
            {"format": "best"},
            None,
            None,
        )
        profile_names = [name for name, _ in profiles]

        self.assertEqual(normalized_url, "https://www.douyin.com/video/123456789")
        self.assertIn("default:auto-cookie-browser-chrome", profile_names)
        self.assertTrue(all("youtube-android" not in name for name in profile_names))


if __name__ == "__main__":
    unittest.main()
