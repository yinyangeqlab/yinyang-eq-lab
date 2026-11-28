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

    func widthControl(_ browser: XCUIApplication) -> XCUIElement? {
        let webView = browser.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 10))
        let matches = webView.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@ AND value == %@", "Width", "Custom")
        )
        if let control = matches.allElementsBoundByIndex.first(where: { $0.isHittable }) {
            return control
        }
        let popup = webView.popUpButtons.matching(
            NSPredicate(format: "value == %@ OR label == %@", "Custom", "Width")
        ).firstMatch
        if popup.exists && popup.isHittable { return popup }
        return nil
    }

    func openWidth(_ state: [String: Any], in browser: XCUIApplication) throws -> CGRect {
        if let width = widthControl(browser) {
            let frame = width.frame
            width.tap()
            return frame
        }
        let web = browser.webViews.firstMatch
        let frequency = web.descendants(matching: .any).matching(
            NSPredicate(format: "label CONTAINS[c] %@ OR value == %@", "Frequency (Hz)", "2400")
        )
        let field = try XCTUnwrap(frequency.allElementsBoundByIndex.first { $0.isHittable && $0.frame.width > 40 })
        let source = try XCTUnwrap(state["frequency"] as? [Double])
        let target = try XCTUnwrap(state["width"] as? [Double])
        let frame = CGRect(x: field.frame.minX + target[0] - source[0],
                           y: field.frame.minY + target[1] - source[1],
                           width: target[2], height: target[3])
        tap(target, widthBox: target, anchor: browser, frame: frame)
        return frame
    }

    func tap(_ box: [Double], widthBox: [Double], anchor: XCUIElement, frame: CGRect) {
        XCTAssertEqual(box.count, 4)
        XCTAssertEqual(widthBox.count, 4)
        let dx = frame.midX + box[0] + box[2] / 2 - widthBox[0] - widthBox[2] / 2
        let dy = frame.midY + box[1] + box[3] / 2 - widthBox[1] - widthBox[3] / 2
        anchor.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: dx, dy: dy)).tap()
    }

    func testFinderWidthPicker() throws {
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        let closed = try waitState { ($0["value"] as? String) == "custom" }
        let userAgent = try XCTUnwrap(closed["ua"] as? String)
        XCTAssertTrue(userAgent.contains("iPhone") && userAgent.contains("Safari/"))
        var frame = try openWidth(closed, in: safari)
        let opened = try waitState { ($0["open"] as? Bool) == true }
        let options = try XCTUnwrap(opened["options"] as? [[String: Any]])
        let custom = try XCTUnwrap(options.first { ($0["value"] as? String) == "custom" })
        XCTAssertEqual(custom["disabled"] as? Bool, true)
        XCTAssertEqual(custom["selected"] as? Bool, true)

        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "iPhone-Safari-dark-Width-open"
        attachment.lifetime = .keepAlways
        add(attachment)

        tap(try XCTUnwrap(custom["box"] as? [Double]),
            widthBox: try XCTUnwrap(opened["width"] as? [Double]), anchor: safari, frame: frame)
        Thread.sleep(forTimeInterval: 0.8)
        var state = try readState()
        XCTAssertEqual(state["value"] as? String, "custom")
        if (state["open"] as? Bool) != true {
            frame = try openWidth(state, in: safari)
            state = try waitState { ($0["open"] as? Bool) == true }
        }
        let reopened = try XCTUnwrap(state["options"] as? [[String: Any]])
        let narrow = try XCTUnwrap(reopened.first { ($0["value"] as? String) == "8" })
        tap(try XCTUnwrap(narrow["box"] as? [Double]),
            widthBox: try XCTUnwrap(state["width"] as? [Double]), anchor: safari, frame: frame)
        _ = try waitState { ($0["value"] as? String) == "8" && ($0["open"] as? Bool) == false }
    }
}
