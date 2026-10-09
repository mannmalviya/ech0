import Expo
import ExpoModulesCore

// Expo's fetch gives up when the server sends nothing for 60 seconds (the iOS default).
// OpenAI can think about a 20-minute part for longer than that before it answers,
// so we let fetch wait up to 10 minutes.
public final class FetchTimeoutSubscriber: ExpoAppDelegateSubscriber {
  @MainActor
  public func subscriberDidRegister() {
    ExpoFetchCustomExtension.setCustomURLSessionConfigurationProvider {
      // Same settings as Expo's own default session, plus the longer wait.
      let config = URLSessionConfiguration.default
      config.httpShouldSetCookies = true
      config.httpCookieAcceptPolicy = .always
      config.httpCookieStorage = HTTPCookieStorage.shared
      config.timeoutIntervalForRequest = 600
      return config
    }
  }
}
