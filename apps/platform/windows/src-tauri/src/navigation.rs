use tauri::{Runtime, Webview};
use url::Url;

pub const APPLICATION_URL: &str = "https://app.codexsun.com/app/";

pub fn is_allowed_application_url(url: &Url) -> bool {
    url.scheme() == "https"
        && url
            .host_str()
            .is_some_and(|host| host.eq_ignore_ascii_case("app.codexsun.com"))
        && url.port_or_known_default() == Some(443)
}

pub fn policy<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("cxapp-navigation-policy")
        .on_navigation(|webview: &Webview<R>, url| {
            webview.label() != "main" || is_allowed_desktop_url(url)
        })
        .build()
}

fn is_allowed_desktop_url(url: &Url) -> bool {
    is_allowed_application_url(url)
        || url.scheme() == "tauri"
        || (url.scheme() == "http"
            && url.host_str() == Some("tauri.localhost")
            && url.port_or_known_default() == Some(80))
        || (cfg!(debug_assertions)
            && url.scheme() == "http"
            && url.host_str() == Some("localhost")
            && url.port() == Some(7030))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_the_canonical_https_host() {
        assert!(is_allowed_application_url(
            &Url::parse(APPLICATION_URL).unwrap()
        ));
        assert!(!is_allowed_application_url(
            &Url::parse("https://evil.example/app/").unwrap()
        ));
        assert!(!is_allowed_application_url(
            &Url::parse("http://app.codexsun.com/app/").unwrap()
        ));
        assert!(!is_allowed_application_url(
            &Url::parse("https://app.codexsun.com.evil.example/app/").unwrap()
        ));
        assert!(is_allowed_desktop_url(
            &Url::parse("tauri://localhost/index.html").unwrap()
        ));
        assert!(is_allowed_desktop_url(
            &Url::parse("http://tauri.localhost/index.html").unwrap()
        ));
        assert!(!is_allowed_desktop_url(
            &Url::parse("http://tauri.localhost.evil.example/index.html").unwrap()
        ));
    }
}
