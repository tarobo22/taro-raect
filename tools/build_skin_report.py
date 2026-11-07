"""Four-page visual delivery report, using screenshots without modifying them."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4,landscape
from reportlab.lib.colors import HexColor,Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from PIL import Image
import json,zipfile
ROOT=Path(__file__).resolve().parents[1]
SCREENS=ROOT/'docs/quality/three-skins-20261107/screens'
VERIFICATION=SCREENS.parent/'DELIVERY-VERIFICATION.json'
native=json.loads(VERIFICATION.read_text(encoding='utf-8')).get('nativeCompletion',{}) if VERIFICATION.exists() else {}
MEDIA=ROOT/'media/three-spaces-20261107'
OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
TARGET=OUT/'여운_세공간_캐릭터_전체스킨_제작보고서.pdf'
pdfmetrics.registerFont(TTFont('KR','C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('KRB','C:/Windows/Fonts/malgunbd.ttf'))
pdfmetrics.registerFont(TTFont('Code','C:/Windows/Fonts/consola.ttf'))
W,H=landscape(A4)
c=canvas.Canvas(str(TARGET),pagesize=(W,H));c.setTitle('여운 - 세 공간·캐릭터·전체 스킨 제작 보고')
INK='#303F3A';MUTED='#66766D';PAPER='#F7F5EF'
def txt(text,x,y,size=12,font='KR',color=INK):
    c.setFont(font,size);c.setFillColor(HexColor(color));c.drawString(x,H-y-size*.8,text)
def para(text,x,y,w,size=11,leading=None,color=INK,font='KR'):
    p=Paragraph(text,ParagraphStyle('body',fontName=font,fontSize=size,leading=leading or size*1.55,textColor=HexColor(color),wordWrap='CJK'))
    _,height=p.wrap(w,500);p.drawOn(c,x,H-y-height);return height
def box(x,y,w,h,fill='#FFFDF8',radius=15,line=None):
    c.setFillColor(HexColor(fill));c.setStrokeColor(HexColor(line or fill));c.roundRect(x,H-y-h,w,h,radius,stroke=bool(line),fill=1)
def img(path,x,y,w,h):
    with Image.open(path) as im:iw,ih=im.size
    scale=min(w/iw,h/ih);dw,dh=iw*scale,ih*scale
    c.drawImage(ImageReader(str(path)),x+(w-dw)/2,H-y-dh,width=dw,height=dh,mask='auto')
def header(n,title,subtitle):
    c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0)
    txt('YEOUN / 2026.11',40,24,9,color=MUTED)
    txt(title,40,45,25,'KRB')
    txt(subtitle,40,82,10,color=MUTED)
    c.setStrokeColor(HexColor('#DCE3DA'));c.line(40,27,W-40,27)
    txt('세 공간 · 캐릭터 · 전체 테마 · 소개영상',40,H-19,8,color=MUTED)
    txt(str(n).zfill(2)+' / 04',W-78,H-19,8,color=MUTED)
def end():c.showPage()
header(1,'세 공간, 하나의 여운.','실제 Android 화면. 공간을 고르면 배경·프레임·메뉴·버튼·안내자가 함께 바뀝니다.' if native else '실제 React 화면. 공간을 고르면 배경·프레임·메뉴·버튼·안내자가 함께 바뀝니다.')
themes=json.loads((ROOT/'assets/skins/themes.json').read_text(encoding='utf-8'))
labels={'cafe':'카페','clinic':'마음 진료실','playroom':'고양이 놀이방'}
descriptions={'cafe':'편안한 셔츠, 차 한 잔의 여유.','clinic':'단정한 옆가르마, 장식 없는 가운.','playroom':'크림색 고양이, 쿠션과 매트, 짧은 야옹.'}
for i,id in enumerate(labels):
    x=40+i*257
    box(x,108,245,431,themes[id]['soft'],20)
    txt(labels[id],x+18,126,17,'KRB',themes[id]['action'])
    img(SCREENS/(('native-android-' if native else 'home-')+id+'.png'),x+35,157,175,352)
    txt(descriptions[id],x+14,520,9,color=themes[id]['muted'])
txt('선택은 기기에 저장합니다. 진료실은 의사 콘셉트의 AI 안내 공간입니다.',42,550,9,color=MUTED);end()
header(2,'캐릭터는 단순하게, 표정은 풍부하게.','몸·팔·손은 이미지로, 얼굴과 의사 머리는 SVG로 분리했습니다. 손끝과 귀의 여백을 확보했습니다.')
img(SCREENS/'asset-overview.png',58,105,W-116,431)
txt('PNG 9개 / 얼굴 SVG 42개 / 배경 3개 / 전체 벽지 3개 / SVG 클리핑 9개',42,541,10,'KRB')
txt('220ms 포즈 교체 · 작은 숨쉬기 · 150ms 깜박임 · 녹음과 비활성 상태에서 반복 소리·움직임 차단',42,554,8,color=MUTED);end()
header(3,'데이터와 화면을 나누고, 필요한 동작만 검증했습니다.','선택 저장과 재생 제어는 실제 RED → GREEN. 디자인은 화면 검토와 타입 검사로 확인했습니다.')
rows=[
 ('선택 저장 TDD','각 5건 RED → GREEN'),
 ('고양이 소리 TDD','각 3건 RED → GREEN'),
 ('기능 회귀','웹 158/158 · RN 161/161'),
 ('타입·패키징','양쪽 타입 / 웹 빌드 / RN 번들 통과'),
 ('브라우저 동작','공간 복원·상담·카드·기록 입력, 오류 0'),
 ('테스트 보호','기존 테스트 수정 없음 / 새 검증 8건'),
]
for i,(name,value) in enumerate(rows):
    y=111+i*35;box(40,y,446,33,'#EBF1E7' if i%2==0 else '#FFFDF8',7)
    txt(name,52,y+10,10,'KRB');txt(value,202,y+10,10)
img(SCREENS/'empathy-panel.png',510,112,287,70)
img(SCREENS/'confirmation-panel.png',510,190,287,120)
txt('실제 앱 UI · 로컬 QA 대화 예시',518,319,9,color=MUTED)
stages=[('선택·저장','SkinSelectionStore'),('조합·데이터','Provider / JSON'),('방·캐릭터','SVG + PNG'),('공통 화면','Frame / UI')]
for i,(title,detail) in enumerate(stages):
    x=40+i*194;box(x,345,177,57,'#DCEBDF',12);txt(title,x+14,357,12,'KRB');txt(detail,x+14,378,9,color=MUTED)
    if i<3:txt('→',x+180,364,14,color=MUTED)
box(40,417,402,115,'#303F3A',12)
code=["request(now, enabled, blocked) {","  if (!enabled || blocked ||","      !Number.isFinite(now) ||","      now - this.last < 1400) return false;","  this.last = now;","  return true;","}"]
for i,line in enumerate(code):txt(line,54,430+i*12,9,'Code','#FFFDF8')
if native:
    ios_status = {
        'success': 'iOS는 Swift 6건과 시뮬레이터 빌드·설치·실행을 통과했습니다.',
        'in_progress': 'iOS는 초기 연결 오류를 수정한 뒤 실행을 재검증 중입니다.',
        'failure': 'iOS 시뮬레이터 실행 검증은 완료되지 않았습니다.',
    }[native['ios']['result']]
    para('<b>네이티브 검증</b><br/>Android APK 두 개의 서명과 리소스를 확인했습니다. x86_64에서 세 공간 전환, 놀이방 복원과 연결 실패 후 재시도를 검증했습니다.<br/>'+ios_status+' APK는 로컬 테스트용입니다.',464,423,331,9,14)
    txt('Android 설치본 열기',464,516,9,'KRB','#426A56')
    c.linkURL(native['apkRelease'],(464,H-531,565,H-513),relative=0)
    txt('iOS 검증 기록',598,516,9,'KRB','#426A56')
    c.linkURL(native['ios']['url'],(598,H-531,690,H-513),relative=0)
else:
    para('<b>검증의 한계</b><br/>Android Kotlin·리소스 컴파일은 통과했습니다. 릴리스 APK는 로컬 debug.keystore 누락으로 조립하지 못했습니다. Windows에서는 Xcode 빌드를 검증하지 못했습니다.<br/>네이티브 야옹 등록은 새 바이너리에 포함해야 합니다. 이후 테마·표정·이미지는 기존 OTA 경로로 갱신할 수 있습니다.',464,423,331,9,14)
txt('FastAPI·AI 프롬프트·PostgreSQL 변경 없음. 이번 제작의 실제 GPT 호출 0회.',42,550,9,color=MUTED);end()
header(4,'말하지 못했던 마음에, 작은 여운을.','60초 가로·세로 소개영상 + 30초 공간 설정 사용법. 한국어 내레이션·클릭 강조·카드 뒤집기·음악을 맞췄습니다.')
samples=[(3,'00-07  마음을 꺼내는 도입'),(10,'07-18  세 공간의 전체 테마'),(25,'18-29  공감하고 이해 확인'),(34,'29-40  카드 세 장 뒤집기'),(47,'40-51  조언에서 마음기록'),(56,'51-60  서비스 이름과 여운')]
for i,(time,label) in enumerate(samples):
    x=40+(i%3)*257;y=108+(i//3)*171
    img(MEDIA/'posters'/('landscape-'+str(time)+'.png'),x,y,243,137)
    txt(label,x+2,y+143,10,'KRB')
repo='https://github.com/tarobo22/taro-raect/tree/codex/three-companion-skins-20261107'
rn='https://github.com/tarobo22/taro/tree/codex/three-companion-skins-20261107'
video='https://github.com/tarobo22/taro-raect/blob/codex/three-companion-skins-20261107/media/three-spaces-20261107/videos/yeoun-three-spaces-landscape-60s.mp4'
for i,(label,url,detail) in enumerate([('웹 · 코드와 에셋',repo,'기능별 커밋과 보고서'),('RN · 앱 코드',rn,'Android / iOS 연결'),('60초 소개영상',video,'GitHub 권한이 필요할 수 있어요')]):
    x=40+i*257;y=466;box(x,y,243,79,'#EBF1E7',12)
    qr=QrCodeWidget(url);a,b,qrw,qrh=qr.getBounds();size=67
    drawing=Drawing(size,size,transform=[size/(qrw-a),0,0,size/(qrh-b),0,0]);drawing.add(qr)
    renderPDF.draw(drawing,c,x+7,H-y-73)
    txt(label,x+83,y+17,11,'KRB');para(detail,x+83,y+38,151,8,12,color=MUTED)
    c.linkURL(url,(x,H-y-79,x+243,H-y),relative=0)
txt('H.264 / AAC / 60fps 출력. 앱 실측 FPS가 아닙니다. 로컬 TTS·직접 만든 음악·CC0 야옹을 사용했습니다.',42,555,8,color=MUTED)
end();c.save()
delivery=ROOT.parent/'deliverables';delivery.mkdir(exist_ok=True)
with zipfile.ZipFile(delivery/'yeoun-three-space-assets.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for file in (ROOT/'assets/skins').rglob('*'):
        if file.is_file():archive.write(file,file.relative_to(ROOT))
    for name in ['cat_meow.wav','cat_meow.license.json','masters/cat_meow_cc0.wav']:
        file=ROOT/'assets/audio'/name;archive.write(file,file.relative_to(ROOT))
    archive.write(ROOT/'tools/build_skin_assets.py','tools/build_skin_assets.py')
print(TARGET,flush=True)
print(delivery/'yeoun-three-space-assets.zip',flush=True)
