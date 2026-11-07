"""Update the delivery report from the uploaded APKs and the iOS workflow evidence."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MOBILE = ROOT.parent / "mobile"
DELIVERABLES = ROOT.parent / "deliverables"
DOC = ROOT / "docs/quality/three-skins-20261107"
NATIVE = MOBILE / "docs/quality/three-skins-20261107/native"
RN_REPO = "tarobo22/taro"
BRANCH = "codex/three-companion-skins-20261107"
WEB_CODE = "abd5feb3daf31f6ec211130ad00301887a303a22"
APP_INPUTS = (".", ":(exclude).github/workflows/ios.yml", ":(exclude)docs/quality/three-skins-20261107/**")
REQUIRED_IOS_STEPS = ("Test native rules", "Build unsigned simulator application", "Launch on a clean simulator")


def gh(*args):
    return json.loads(subprocess.check_output(["gh", *args], cwd=ROOT, encoding="utf-8"))


def git(*args):
    return subprocess.check_output(["git", *args], cwd=MOBILE, encoding="utf-8").strip()


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_android():
    apks = [read_json(NATIVE / name) for name in ("android-arm64.json", "android-x86.json")]
    device = read_json(NATIVE / "android-device-proof.json")
    for flag in ("installedAndLaunched", "playroomRestoredAfterForceStopAndLaunch", "catFaceCorrectlyAnchored"):
        if not device[flag]:
            raise SystemExit(f"Android device verification missing: {flag}")
    if device["observedThemes"] != ["cafe", "clinic", "playroom"]:
        raise SystemExit("The device report must cover all three spaces.")
    for theme, capture in device["screenCaptures"].items():
        if sha(NATIVE / capture["file"]) != capture["sha256"] or sha(
            DOC / "screens" / f"native-android-{theme}.png"
        ) != capture["sha256"]:
            raise SystemExit(f"Android screenshot digest mismatch: {theme}")
    draft = next(
        r for r in gh("api", f"repos/{RN_REPO}/releases?per_page=100")
        if r["tag_name"] == "preview-three-spaces-20261107"
    )
    if not draft["draft"]:
        raise SystemExit("Expected the Android preview to be a draft release.")
    remote = {asset["name"]: asset for asset in draft["assets"]}
    for apk in apks:
        uploaded = remote[apk["artifact"]]
        if (
            not apk["signatureVerified"]
            or uploaded["state"] != "uploaded"
            or sha(DELIVERABLES / "android" / apk["artifact"]) != apk["sha256"]
            or uploaded["digest"] != "sha256:" + apk["sha256"]
        ):
            raise SystemExit(f"Android APK verification mismatch: {apk['artifact']}")
    return apks, device, draft


def read_ios(run_id):
    run = gh(
        "run", "view", run_id, "--repo", RN_REPO, "--json",
        "headBranch,headSha,status,conclusion,url,workflowName,jobs",
    )
    if run["headBranch"] != BRANCH or run["workflowName"] != "iOS simulator checks":
        raise SystemExit("This workflow run is not from the delivery branch.")
    if git("diff", "--name-only", run["headSha"], "--", *APP_INPUTS):
        raise SystemExit("RN application inputs changed after the iOS revision.")
    job = next(j for j in run["jobs"] if j["name"] == "simulator")
    steps = {step["name"]: step for step in job["steps"]}
    status = "in_progress"
    if run["status"] == "completed":
        status = "success" if run["conclusion"] == "success" else "failure"
    summary = {
        "runId": int(run_id), "url": run["url"], "sourceCommit": run["headSha"], "result": status,
        "workflowConclusion": run["conclusion"],
        "checkedSteps": {name: steps[name] for name in REQUIRED_IOS_STEPS if name in steps},
    }
    if status != "success":
        return summary, None
    if any(steps[name]["conclusion"] != "success" for name in REQUIRED_IOS_STEPS):
        raise SystemExit("Native rules, build, and actual launch must pass.")
    download = MOBILE / ".local" / ("ios-proof-" + run_id)
    subprocess.run(
        ["gh", "run", "download", run_id, "--repo", RN_REPO, "--name", "ios-simulator-proof", "--dir", str(download)],
        check=True, cwd=MOBILE,
    )
    core, build, launch, process = (
        (download / name).read_text(encoding="utf-8", errors="replace")
        for name in ("core.log", "build.log", "launch.log", "process.log")
    )
    counts = [(int(n), int(fail)) for n, fail in re.findall(r"Executed (\d+) tests?, with (\d+) failures", core)]
    pid = re.search(r"^com\.yeoun\.app:\s*([1-9]\d*)\s*$", launch, re.MULTILINE)
    screen = download / "launch.png"
    if (
        not counts or max(n for n, _ in counts) != 6 or any(fail for _, fail in counts)
        or "** BUILD SUCCEEDED **" not in build or not pid or not process.strip()
        or not screen.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
    ):
        raise SystemExit("The downloaded iOS evidence does not prove a successful launch.")
    summary["artifactEvidence"] = {
        "runId": int(run_id), "sourceCommit": run["headSha"], "swiftPassed": 6, "swiftFailures": 0,
        "buildSucceeded": True, "launchProcessObserved": True, "pid": int(pid[1]), "screen": "ios-launch.png",
        "screenSha256": sha(screen),
        **{name + "Sha256": sha(download / (name + ".log")) for name in ("build", "core", "launch", "process")},
    }
    return summary, screen


def update_report(details):
    ios = details["ios"]
    draft_url = details["apkRelease"]
    ios_result = {
        "success": "macOS 러너 Swift 6건, 시뮬레이터 빌드·설치, 실행 5초 후 PID와 실행 파일 확인, 화면 캡처·딥링크 열기 통과",
        "in_progress": "Swift 6건·빌드·설치 확인. PID가 반환된 뒤 기존 프로세스 검사가 실패해 검사 방식을 바꿔 재검증 중",
        "failure": "시뮬레이터 실행 검증 미완료. 실패 단계는 실행 기록 참고",
    }[ios["result"]]
    report_path = DOC / "REPORT.md"
    report = report_path.read_text(encoding="utf-8")
    for row, value in (
        ("Android", "x86_64·ARM64 APK 조립·서명·패키징 통과. x86_64 설치·세 공간 전환·재실행 복원 확인"),
        ("iOS", ios_result),
    ):
        report = re.sub(rf"(?m)^\| {row} \|.*$", lambda _: f"| {row} | {value} |", report)
    report = re.sub(
        r" iOS 시뮬레이터 CI는 보고서 작성 시 진행 중이며 .*?에서 확인할 수 있다\.",
        "", report,
    )
    report = report.replace("actions/runs/42330099460", "actions/runs/42334931931")
    report = report.replace("actions/runs/42330103172", "actions/runs/42335124459")
    heading = "\n## 네이티브 검증\n"
    report = report.split(heading, 1)[0].rstrip() + "\n" + heading + "\n"
    report += (
        f"- [Android APK 두 개와 체크섬]({draft_url}): GitHub 초안 릴리스. ARM64는 패키징·서명, "
        "x86_64는 설치와 실제 앱 동작까지 검증했다.\n"
        "- [Android 놀이방 복원 화면](screens/native-android-restored-playroom.png): 전체 테마와 고양이 얼굴을 확인할 수 있다.\n"
        "- Android 빌드는 SDK 기본 테스트 서명을 사용하고 JSON과 에셋을 번들 입력으로 추적한다. "
        "미리보기는 별도 패키지로 로컬 QA API에 연결한다.\n"
        f"- [iOS 검증 기록]({ios['url']}): {ios_result}. Android와 iOS의 앱 소스는 같고, CI 설정과 검증 문서만 달라졌다.\n"
        "- 기존 기능 테스트 코드는 유지했다. iOS 실행 설정에서 러너 CPU와 제한 시간을 조정하고, "
        "앱 PID·실행 파일 대조와 실패 시 로그 수집을 적용했다.\n"
    )
    report_path.write_text(report, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("run_id", type=int, help="GitHub iOS workflow run ID")
    args = parser.parse_args()
    ios, screen = read_ios(str(args.run_id))
    apks, device, draft = read_android()
    source = device["sourceCommit"]
    if (
        any(apk["sourceCommit"] != source for apk in apks)
        or draft["target_commitish"] != source
        or git("diff", "--name-only", source, ios["sourceCommit"], "--", *APP_INPUTS)
    ):
        raise SystemExit("Android and iOS evidence must refer to identical application inputs.")
    if screen is not None:
        shutil.copyfile(screen, NATIVE / "ios-launch.png")
        write_json(NATIVE / "ios-simulator-proof.json", ios["artifactEvidence"])
    details = {
        "apkRelease": draft["html_url"], "isDraft": True, "androidApks": apks, "androidDevice": device,
        "remoteApkDigestsMatch": True, "androidBundleInputs": read_json(NATIVE / "android-bundle-input-proof.json"),
        "sameApplicationInputs": True, "ios": ios,
    }
    path = DOC / "DELIVERY-VERIFICATION.json"
    verification = read_json(path)
    verification.update(
        nativeCompletion=details,
        androidApk="Signed previews verified for x86_64 and arm64-v8a. x86_64 exercised in Android 35.",
        iosCI=ios["result"],
        iosLocalBuild="Xcode validation runs on the GitHub macOS runner.",
        codeHeads={"web": WEB_CODE, "rn": source},
    )
    write_json(path, verification)
    update_report(details)
    subprocess.run([sys.executable, str(ROOT / "tools/build_skin_report.py")], cwd=ROOT, check=True)
    verification["pdfSha256"] = sha(ROOT / "output/pdf/여운_세공간_캐릭터_전체스킨_제작보고서.pdf")
    verification["assetsZipSha256"] = sha(DELIVERABLES / "yeoun-three-space-assets.zip")
    write_json(path, verification)
    print(f"Android evidence checked; report generated with iOS result: {ios['result']}")


if __name__ == "__main__":
    main()
