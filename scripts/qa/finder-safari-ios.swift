import Foundation
import XCTest

final class FinderSafariTest: XCTestCase {
    func readState() throws -> [String: Any] {
        let url = URL(string: "http://127.0.0.1:5813/__finder_qa_status")!
        let done = XCTestExpectation(description: "Read Finder state from the loopback fixture")
        final class ResultBox: @unchecked Sendable { var data: Data? }
        let box = ResultBox()
        URLSession.shared.dataTask(with: url) { data, _, _ in
            box.data = data
            done.fulfill()
        }.resume()
        wait(for: [done], timeout: 4)
        return try JSONSerialization.jsonObject(with: XCTUnwrap(box.data)) as? [String: Any] ?? [:]
    }

    func waitState(_ predicate: ([String: Any]) -> Bool) throws -> [String: Any] {
        for _ in 0..<45 {
            let state = try readState()
            if predicate(state) { return state }
            Thread.sleep(forTimeInterval: 0.4)
        }
        throw NSError(domain: "Finder did not report the expected Safari state", code: 1)
    }

    func tap(_ box: [Double], in browser: XCUIApplication) {
        let webView = browser.webViews.firstMatch
        XCTAssertTrue(webView.exists)
        XCTAssertEqual(box.count, 4)
        let point = CGVector(dx: box[0] + box[2] / 2, dy: box[1] + box[3] / 2)
        webView.coordinate(withNormalizedOffset: .zero).withOffset(point).tap()
    }

    func testFinderWidthPicker() throws {
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        let closed = try waitState { ($0["value"] as? String) == "custom" }
        let userAgent = try XCTUnwrap(closed["ua"] as? String)
        XCTAssertTrue(userAgent.contains("iPhone") && userAgent.contains("Safari/"))
        tap(try XCTUnwrap(closed["width"] as? [Double]), in: safari)
        let opened = try waitState { ($0["open"] as? Bool) == true }
        let options = try XCTUnwrap(opened["options"] as? [[String: Any]])
        let custom = try XCTUnwrap(options.first { ($0["value"] as? String) == "custom" })
        XCTAssertEqual(custom["disabled"] as? Bool, true)
        XCTAssertEqual(custom["selected"] as? Bool, true)

        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "iPhone-Safari-dark-Width-open"
        attachment.lifetime = .keepAlways
        add(attachment)

        tap(try XCTUnwrap(custom["box"] as? [Double]), in: safari)
        Thread.sleep(forTimeInterval: 0.8)
        var state = try readState()
        XCTAssertEqual(state["value"] as? String, "custom")
        if (state["open"] as? Bool) != true {
            tap(try XCTUnwrap(state["width"] as? [Double]), in: safari)
            state = try waitState { ($0["open"] as? Bool) == true }
        }
        let reopened = try XCTUnwrap(state["options"] as? [[String: Any]])
        let narrow = try XCTUnwrap(reopened.first { ($0["value"] as? String) == "8" })
        tap(try XCTUnwrap(narrow["box"] as? [Double]), in: safari)
        _ = try waitState { ($0["value"] as? String) == "8" && ($0["open"] as? Bool) == false }
    }
}
