import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import backgroundOreum from "C:/Users/sonc3/Desktop/seunghyun/jeju-oreum-app/src/assets/Background_Oreum.png"
import chatgptOreum1 from "C:/Users/sonc3/Desktop/seunghyun/jeju-oreum-app/src/assets/Chatgpt_Oreum1.png"
import chatgptOreum2 from "C:/Users/sonc3/Desktop/seunghyun/jeju-oreum-app/src/assets/Chatgpt_Oreum2.png"
import chatgptOreum3 from "C:/Users/sonc3/Desktop/seunghyun/jeju-oreum-app/src/assets/Chatgpt_Oreum3.png"
import chatgptOreum4 from "C:/Users/sonc3/Desktop/seunghyun/jeju-oreum-app/src/assets/Chatgpt_Oreum4.png"
import chatgptOreum5 from "C:/Users/sonc3/Desktop/seunghyun/jeju-oreum-app/src/assets/Chatgpt_Oreum5.png"

// [1단계] 파일 상단(import 직후)에 이 분석 함수들을 추가하세요.

// 위성 지수 분석용 인터페이스
interface IndexAnalysis {
    status: string;    // 상태 (예: 침수, 양호 등)
    message: string;   // 사용자 메시지 (예: 장화 필수!)
    level: string;     // AI 판단용 레벨 (Critical, Warning, Good, Info)
}

// 이미지 기준에 맞춘 정밀 분석 함수
// [1단계 수정] 엑셀 기준표와 100% 일치시킨 정밀 분석 함수
const getOreumAnalysis = (type: 'NDWI' | 'EVI' | 'NMDI' | 'BSI', value: number | null): IndexAnalysis => {
    // 값이 없거나 숫자가 아닌 경우 처리
    if (value === null || value === undefined || isNaN(value)) {
        return { status: "정보없음", message: "데이터 수신 대기중...", level: "Info" };
    }

    // 1. NDWI (질척임) [엑셀 기준 반영]
    if (type === 'NDWI') {
        if (value > 0.1) return { status: "🌊 침수/물웅덩이", message: "등산로가 물에 잠겼을 수 있어요. 장화 필수!", level: "Critical" };
        if (value >= -0.1) return { status: "💩 질척거림", message: "땅이 많이 질척거려요. 미끄러움 주의!", level: "Warning" }; // -0.1 ~ 0.1
        if (value >= -0.3) return { status: "💧 약간 습함", message: "땅이 촉촉해요. 걷기 좋은 흙길입니다.", level: "Good" }; // -0.3 ~ -0.1
        return { status: "🌞 건조/뽀송함", message: "땅이 뽀송뽀송해요. 운동화도 OK!", level: "Good" }; // < -0.3
    }

    // 2. EVI (녹색도) [엑셀 기준 반영]
    if (type === 'EVI') {
        if (value > 0.45) return { status: "🌳 울창함", message: "인생샷 명소! 초록빛이 절정이에요. 📸", level: "Best" };
        if (value >= 0.25) return { status: "🌿 양호", message: "풀내음 가득한 산책을 즐겨보세요.", level: "Good" }; // 0.25 ~ 0.45
        if (value >= 0.15) return { status: "🍂 휴지기", message: "식물들이 쉬고 있어요 (가을/겨울 느낌).", level: "Info" }; // 0.15 ~ 0.25
        return { status: "🟤 황폐/없음", message: "황량한 풍경입니다. (바위나 흙이 많음)", level: "Info" }; // < 0.15
    }

    // 3. NMDI (화재위험) [엑셀 기준 반영]
    if (type === 'NMDI') {
        if (value > 0.4) return { status: "✅ 안전", message: "식생이 촉촉해서 산불 위험이 낮습니다.", level: "Safe" };
        if (value >= 0.2) return { status: "⚠️ 주의", message: "건조합니다. 작은 불씨도 조심하세요.", level: "Warning" }; // 0.2 ~ 0.4
        return { status: "🚨 위험", message: "산불 위험 최고조! 인화물질 절대 반입 금지 🚫", level: "Critical" }; // < 0.2
    }

    // 4. BSI (침식/훼손) [엑셀 기준 반영]
    if (type === 'BSI') {
        if (value > 0.1) return { status: "🚧 침식 경고", message: "등산로 훼손이 심각해 보여요. 우회 권장.", level: "Warning" };
        if (value >= 0.0) return { status: "📉 노출 시작", message: "흙이 드러난 구간이 많습니다.", level: "Info" }; // 0.0 ~ 0.1
        return { status: "🛡️ 안정", message: "숲이 흙을 잘 잡아주고 있어요.", level: "Good" }; // < 0.0
    }

    return { status: "알수없음", message: "-", level: "Info" };
};

// Supabase 초기화
const supabaseUrl = "SUPABASE_URL";
const supabaseKey = "SUPABASE_KEY";

let supabase: SupabaseClient | null = null;
try {
    supabase = createClient(supabaseUrl, supabaseKey);
} catch (e) {
    console.error("Supabase init error:", e);
}

// CSV 데이터 (백업용)
const OREUM_DATA = `연번,오름명,소재지,개요,표고,비고,난이도
1,성산일출봉,서귀포시 성산읍 성산리 1,유네스코 세계자연유산으로 지정된 수중화산체. 정상 뷰가 압도적임.,180,174,중
2,거문오름,제주시 조천읍 선흘리 478,유네스코 세계자연유산. 예약 필수. 숲이 울창하고 용암동굴계의 모태.,456,112,중
3,새별오름,제주시 애월읍 봉성리 산59-8,가을 억새가 장관이며 들불축제로 유명함. 경사가 다소 가파름.,519,119,중
4,용눈이오름,제주시 구좌읍 종달리 산28,부드러운 능선이 아름다워 사진 작가들이 사랑하는 오름. 일출 명소.,247,88,하
5,다랑쉬오름,제주시 구좌읍 세화리 산6,오름의 여왕. 완벽한 분화구를 가짐. 뷰가 환상적이나 오르기 힘듬.,382,227,상
6,윗세오름,제주시 애월읍 광령리 산183,한라산 영실코스에 위치. 철쭉과 설경이 아름다움.,1700,0,상
7,사라오름,서귀포시 남원읍 신례리 산2-1,한라산 중턱에 위치하며 산정호수가 신비로움.,1324,150,상
8,백약이오름,서귀포시 표선면 성읍리 산1,약초가 많이 자란다 하여 붙은 이름. 계단길이 예뻐 스냅 사진 명소.,357,132,하
9,노꼬메오름,제주시 애월읍 유수암리 산138,경사가 가파르고 높지만 정상 뷰가 탁월함.,833,234,상
10,따라비오름,서귀포시 표선면 가시리 산62,가을 억새가 장관인 오름의 여왕(동부). 곡선미가 뛰어남.,342,107,중
11,금오름,제주시 한림읍 금악리 산1-1,정상 분화구에 물이 고이는 산정화구호. 차로 근처까지 이동 가능.,427,178,하
12,저지오름,제주시 한경면 저지리 산51,아름다운 숲 전국대회 대상. 산책로가 잘 정비됨.,239,100,하
13,물영아리오름,서귀포시 남원읍 수망리 산188,람사르 습지로 지정된 신비한 산정 화구호.,508,128,중
14,안돌오름,제주시 구좌읍 송당리 산66-2,비밀의 숲(편백나무 숲) 근처에 위치. 웨딩 스냅 성지.,368,93,하
15,군산오름,서귀포시 안덕면 창천리 564,차로 정상 부근까지 갈 수 있어 일몰 명소로 유명.,334,280,하
16,도두봉,제주시 도두일동 산1,공항 근처라 비행기 이착륙을 볼 수 있음. 키세스존 포토스팟 유명.,63,50,하
17,민오름,제주시 오라2동 산28,제주시내에 위치하여 접근성이 좋음. 소나무 숲이 울창함.,251,117,하
18,아부오름,제주시 구좌읍 송당리 산164-1,영화 이재수의 난 촬영지. 분화구 둘레길이 완만하고 아름다움.,301,51,하
19,붉은오름,서귀포시 표선면 가시리 산158,붉은 흙이 덮여 있어 붙은 이름. 자연휴양림 내에 위치.,569,129,중
20,큰노꼬메오름,제주시 애월읍 유수암리 산138,오름 트레킹 매니아들이 선호하는 다소 난이도 있는 코스.,833,234,상
21,족은노꼬메오름,제주시 애월읍 유수암리 산138,큰노꼬메 옆에 위치하며 상대적으로 숲이 우거짐.,774,124,중
22,바리메오름,제주시 애월읍 어음리 산3,절 모양이 스님들의 공양 그릇인 바리 같다 하여 붙은 이름.,763,213,중
23,정물오름,제주시 한림읍 금악리 산52-1,당오름과 마주보고 있으며 억새가 아름다움.,466,151,중
24,문도지오름,제주시 한림읍 금악리 3432,방목된 말들을 볼 수 있는 올레길 코스.,260,55,하
25,동거문오름,제주시 구좌읍 종달리 산28,거미집처럼 복잡한 분화구 구조가 독특함.,340,115,중
26,높은오름,제주시 구좌읍 송당리 산213-1,구좌읍에서 가장 높은 오름. 정상 뷰가 시원함.,405,175,상
27,손지오름,제주시 구좌읍 종달리 산52,손자처럼 귀엽게 생겼다 하여 붙은 이름.,256,76,하
28,지미봉,제주시 구좌읍 종달리 산2,우도와 성산일출봉이 한눈에 보이는 최고의 전망대.,165,160,중
29,서우봉,제주시 조천읍 함덕리 169-1,함덕해수욕장 바로 옆. 봄철 유채꽃과 바다 뷰가 환상적.,113,106,하
30,고근산,서귀포시 서호동 1286-1,서귀포 신시가지가 한눈에 보이는 전망 좋은 오름.,396,171,하
31,솔오름(미악산),서귀포시 동홍동 2182,한라산과 서귀포 시내를 동시에 조망 가능.,567,113,중
32,가시오름,서귀포시 표선면 하천리 산13,가시나무가 많아 붙은 이름이나 현재는 숲이 울창함.,106,52,하`;

interface Oreum {
    id: string | number;
    name: string;
    loc?: string;
    desc?: string;
    height?: number | string;
    remark?: number | string;
    diff?: string;
    NDWI?: number | string | null;
    EVI?: number | string | null;
    NMDI?: number | string | null;
    BSI?: number | string | null;
    x_coord?: number | string;
    y_coord?: number | string;
    address?: string;
    altitude?: number | string;
    area?: number | string;
    form?: string;
    difficulty?: string;
    [key: string]: any;
}

// 아이콘 컴포넌트
const Icons = {
    Mountain: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>,
    Map: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" x2="8" y1="2" y2="18"/><line x1="16" x2="16" y1="6" y2="22"/></svg>,
    Award: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
    Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
    Activity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
    Coins: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18 8a6 6 0 0 0-12 0"/><path d="M7 15a6 6 0 0 1 5 5"/><path d="M2 15a6 6 0 0 1 5 5"/></svg>,
    Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/></svg>,
    Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
    ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"/></svg>
};

// 스크롤 리빌 애니메이션 컴포넌트
const ScrollReveal = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );
        if (ref.current) observer.observe(ref.current);
        return () => { if (ref.current) observer.unobserve(ref.current); };
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${ 
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
            }`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

const StatCard = ({ label, value, sub, icon: Icon, color }: { label: string, value: string, sub: string, icon: React.FC<any>, color: 'blue' | 'emerald' | 'amber' | 'purple' }) => {
    const colorVariants = {
        blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
        emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
        amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
        purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' }
    };
    const variant = colorVariants[color] || colorVariants.blue;

    return (
        <div className="group relative overflow-hidden p-6 rounded-3xl border border-white/20 transition-all duration-500 hover:border-blue-500/50">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3 ${variant.bg} rounded-2xl ${variant.text} group-hover:scale-110 transition-transform duration-500`}>
                    <Icon />
                </div>
                <div className={`text-xs font-bold ${variant.text} px-2 py-1 ${variant.bg} rounded-lg`}>{sub}</div>
            </div>
            <div>
                <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">{label}</div>
                <div className="text-4xl font-black text-white tracking-tight">{value}</div>
            </div>
        </div>
    );
};

const UserFeedItem = ({ user, loc, time, img }: { user: string, loc: string, time: string, img: string }) => (
    <div className="flex-shrink-0 w-64 bg-white rounded-xl overflow-hidden shadow-lg mx-2">
        <div className="h-40 overflow-hidden">
            <img src={img} className="w-full h-full object-cover" alt={loc} />
        </div>
        <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full bg-cover" style={{backgroundImage: `url(https://api.dicebear.com/7.x/avataaars/svg?seed=${user})`}}></div>
                <span className="text-sm font-bold">{user}</span>
            </div>
            <div className="text-xs text-gray-500 flex justify-between">
                <span>📍 {loc}</span>
                <span>{time}</span>
            </div>
        </div>
    </div>
);

const AIRecommendationSection = ({ oreums }: { oreums: Oreum[] }) => {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const API_KEY = "OPEN_API";

    // [2단계 수정] AIRecommendationSection 내부의 handleSearch 함수 교체
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        
        if (!oreums || oreums.length === 0) {
            setResult({ error: "오름 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요." });
            return;
        }

        setLoading(true);
        setResult(null);

        // [최적화] 전체 오름을 다 보내면 토큰 초과로 AI가 멈춥니다.
        // 데이터가 많을 경우 상위 50개 또는 이름이 매칭되는 오름 위주로 필터링해서 보내야 합니다.
        // 여기서는 일단 앞에서부터 50개만 자릅니다. (필요 시 로직 변경 가능)
        const targetOreums = oreums.slice(0, 50); 

        // CSV 포맷팅
        const csvData = targetOreums.map(o => {
            const muddy = getOreumAnalysis('NDWI', typeof o.NDWI === 'number' ? o.NDWI : null);
            const green = getOreumAnalysis('EVI', typeof o.EVI === 'number' ? o.EVI : null);
            const fire = getOreumAnalysis('NMDI', typeof o.NMDI === 'number' ? o.NMDI : null);
            const erosion = getOreumAnalysis('BSI', typeof o.BSI === 'number' ? o.BSI : null);

            // AI가 데이터를 잘 이해하도록 포맷팅
            return `- ${o.name}(${o.loc}): 높이 ${o.height}m, 난이도 ${o.diff}, ` + 
                   `NDWI:${o.NDWI}(${muddy.status}), EVI:${o.EVI}(${green.status}), ` +
                   `NMDI:${o.NMDI}(${fire.status}), BSI:${o.BSI}(${erosion.status}) \n` +
                   `  *가이드: "${muddy.message}" / "${green.message}"`; 
        }).join('\n');

        try {
            const systemPrompt = `당신은 제주도 오름 전문가이자 위성 데이터 분석가입니다.
사용자의 질문을 분석하여 **'특정 오름 문의'**인지 **'추천 요청'**인지 판단하고, 반드시 아래 JSON 형식으로만 답변하세요. (마크다운 금지)

[분석 기준표]
1. NDWI(질척임): >0.1(침수), -0.1~0.1(질척거림), -0.3~-0.1(습함), <-0.3(뽀송)
2. EVI(녹색도): >0.45(울창), 0.25~0.45(양호), 0.15~0.25(휴지기), <0.15(황폐)
3. NMDI(화재): >0.4(안전), 0.2~0.4(주의), <0.2(위험)
4. BSI(훼손): >0.1(심각), 0.0~0.1(노출), <0.0(안정)

[수행 지침]
1. **Case A (단일 오름 문의)**: "새별오름 어때?" 처럼 특정 오름을 물으면 'type': "single"로 응답.
   - 데이터에 있는 [가이드 메시지]를 인용하여 구체적 이유를 설명하세요.
2. **Case B (추천 요청)**: "걷기 좋은 곳 추천해줘" 처럼 추천을 원하면 'type': "list"로 응답.
   - 지수들을 종합적으로 고려하여 상위 3~5개를 추천하세요.

[필수 JSON 반환 형식]
{
  "type": "single" OR "list",
  "data": { ...객체 } OR [ ...배열 ]
}

* single일 때 data: { "name": "...", "intro": "한줄요약", "reason": "상세이유", "location": "...", "height": "...", "info": "특징" }
* list일 때 data: [ { "name": "...", "intro": "...", "reason": "...", "location": "...", "height": "..." }, ... ]

[제공 데이터 (상위 50개)]
${csvData}`;

            console.log("AI 요청 전송 중..."); // 디버깅

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: query }],
                    max_tokens: 3000, // 토큰 넉넉하게
                    temperature: 0.7
                })
            });
            
            const data = await response.json();
            
            if (data.choices && data.choices[0]) {
                const content = data.choices[0].message.content;
                console.log("AI 원본 응답:", content); // [중요] F12 콘솔에서 확인 가능

                // [강력한 파싱 로직] JSON 부분만 발췌
                const jsonMatch = content.match(/\{[\s\S]*\}/); 
                if (!jsonMatch) {
                    throw new Error("JSON 형식을 찾을 수 없습니다.");
                }
                
                const parsedResult = JSON.parse(jsonMatch[0]);

                // 데이터 구조 안전 장치
                if (parsedResult.type === 'single' && Array.isArray(parsedResult.data)) {
                    parsedResult.data = parsedResult.data[0];
                }
                setResult(parsedResult);
            }
        } catch (error) {
            console.error("API/Parsing Error:", error);
            setResult({ error: "AI 분석 결과를 가져오는 데 실패했습니다. 다시 시도해주세요." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="py-32 max-w-4xl mx-auto px-6 text-center">
            <ScrollReveal>
                <div className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-4">OREUM AI RECOMMENDATION</div>
                <h2 className="text-4xl md:text-5xl font-black mb-6">Sentinel 1&2기반 맞춤 오름 추천 AI</h2>
                <p className="text-gray-500 text-lg mb-12">"사용자 맞춤형 오름 리스트 추천, 오름 등산 의사결정 두 가지 기능이 있습니다."</p>
                <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto mb-16">
                    <div className="bg-white p-2 rounded-full flex items-center shadow-2xl border border-blue-100 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all duration-300">
                        <div className="pl-6 text-gray-400"><Icons.Search /></div>
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="(예: 제주한라대 근처의 오름들을 추천해줘, 어제 비 왔는데 용눈이오름 올라가도 될까?)"
                            className="flex-1 bg-transparent border-none px-4 py-4 text-lg focus:outline-none text-gray-800 placeholder-gray-400"
                        />
                        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30 whitespace-nowrap">
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>AI 분석</>}
                        </button>
                    </div>
                </form>
            </ScrollReveal>

            {result && !result.error && (
                <div className="animate-[fadeIn_0.5s_ease-out]">
                    
                    {/* CASE 1: Single Type (기존처럼 큰 카드 하나) */}
                    {result.type === 'single' && result.data && (
                        <div className="text-left bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col md:flex-row">
                            <div className="md:w-1/2 h-80 md:h-auto bg-gray-200 relative overflow-hidden group">
                            <img 
                                src={`./images/${result.data.name}.jpg`} 
                                alt="Oreum"
                                className="w-full h-full object-cover object-center ..." // 기존 클래스 유지
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                // 무한 루프 방지 (대체 이미지도 깨질 경우를 대비)
                                
                                e.currentTarget.onerror = null; 
                                    
                                // 2. 대체 이미지들을 배열로 묶습니다.
                                const fallbackImages = [
                                chatgptOreum1, 
                                chatgptOreum2, 
                                chatgptOreum3, 
                                chatgptOreum4, 
                                chatgptOreum5
                                ];

                                // 3. 0부터 4까지의 랜덤 인덱스를 생성합니다.
                                const randomIndex = Math.floor(Math.random() * fallbackImages.length);

                                // 4. 랜덤하게 선택된 이미지 경로를 src에 넣어줍니다.
                                e.currentTarget.src = fallbackImages[randomIndex];
                            }} 
                        />
  
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                                    <div>
                                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded uppercase mb-2 inline-block">AI ANALYSIS</span>
                                        <h3 className="text-4xl font-black text-white">{result.data.name}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="md:w-1/2 p-10 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="text-blue-600 font-bold text-lg">"{result.data.intro}"</span>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <h4 className="font-bold text-sm text-gray-400 mb-2 uppercase">분석 결과 & 추천 이유</h4>
                                        <p className="text-gray-800 text-md leading-relaxed font-medium">{result.data.reason}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div><h4 className="font-bold text-sm text-gray-400 mb-1">위치</h4><p className="text-gray-900 font-bold">{result.data.location}</p></div>
                                        <div><h4 className="font-bold text-sm text-gray-400 mb-1">높이</h4><p className="text-gray-900 font-bold">{result.data.height}</p></div>
                                        <div className="col-span-2"><h4 className="font-bold text-sm text-gray-400 mb-1">특징</h4><p className="text-gray-900 font-bold">{result.data.info}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CASE 2: List Type (여러개 리스트 형태) */}
                    {result.type === 'list' && Array.isArray(result.data) && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-900 text-left ml-2 mb-4">
                                ✨ AI가 찾은 <span className="text-blue-600">{result.data.length}개</span>의 추천 장소
                            </h3>
                            {result.data.map((item: any, idx: number) => (
                                <div key={idx} className="group bg-white rounded-3xl p-2 shadow-xl hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-1 flex flex-col md:flex-row overflow-hidden text-left">
                                    <div className="md:w-64 h-48 md:h-auto rounded-2xl overflow-hidden relative flex-shrink-0">
                                    <img 
                                src={`./images/${result.data.name}.jpg`} 
                                alt="Oreum"
                                className="..." // 기존 클래스 유지
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                // 무한 루프 방지 (대체 이미지도 깨질 경우를 대비)
                                
                                e.currentTarget.onerror = null; 
                                    
                                // 2. 대체 이미지들을 배열로 묶습니다.
                                const fallbackImages = [
                                chatgptOreum1, 
                                chatgptOreum2, 
                                chatgptOreum3, 
                                chatgptOreum4, 
                                chatgptOreum5
                                ];

                                // 3. 0부터 4까지의 랜덤 인덱스를 생성합니다.
                                const randomIndex = Math.floor(Math.random() * fallbackImages.length);

                                // 4. 랜덤하게 선택된 이미지 경로를 src에 넣어줍니다.
                                e.currentTarget.src = fallbackImages[randomIndex];
                            }} 
                        />
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-blue-800 text-xs font-black px-3 py-1.5 rounded-full shadow-sm">
                                            TOP {idx + 1}
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col justify-center">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded border border-blue-100">{item.intro}</span>
                                            <span className="text-gray-400 text-xs flex items-center gap-1"><Icons.Map /> {item.location}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
                                            {item.name}
                                            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{item.height}</span>
                                        </h3>
                                        <div className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-100">
                                            <div className="flex items-start gap-2">
                                                <div className="mt-1 text-blue-500"><Icons.Sparkles /></div>
                                                <p className="text-sm text-gray-700 font-medium leading-relaxed">"{item.reason}"</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 에러 표시 */}
            {result && result.error && (
                <div className="p-6 bg-red-50 text-red-500 rounded-2xl font-bold border border-red-100 animate-[fadeIn_0.3s]">
                    ⚠️ {result.error}
                </div>
            )}
        </section>
    );
};

// [3단계 수정] OreumDetailModal 컴포넌트 전체 교체
const OreumDetailModal = ({ oreum, onClose }: { oreum: Oreum | null, onClose: () => void }) => {
    if (!oreum) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-[scaleUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                
                {/* 상단 이미지 영역 */}
                <div className="relative h-64 bg-gray-200">
                    <img 
                        src={`./images/${oreum.name}.jpg`} 
                        alt="Oreum Background"
                        className="absolute inset-0 w-full h-full object-cover opacity-50" // 기존 스타일 유지
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        // 1. 무한 루프 방지 (대체 이미지도 로드 실패할 경우 대비)
                        e.currentTarget.onerror = null;

                        const fallbackImages = [
                            chatgptOreum1,
                            chatgptOreum2,
                            chatgptOreum3,
                            chatgptOreum4,
                            chatgptOreum5
                            ];

                        // 2. 0부터 4까지의 랜덤 숫자 생성 (배열 길이만큼)
                        const randomIndex = Math.floor(Math.random() * fallbackImages.length);

                        // 3. 랜덤하게 뽑힌 이미지를 src에 적용
                        e.currentTarget.src = fallbackImages[randomIndex];
                        }}
                    />
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all"
                        aria-label="닫기"
                    >
                        {/* X 모양 아이콘만 남김 */}
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="24" 
                            height="24" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                        <div className="flex items-center gap-3 mb-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white 
                                ${String(oreum.diff || '').trim() === '상' ? 'bg-red-500' : String(oreum.diff || '').trim() === '중' ? 'bg-yellow-500' : 'bg-emerald-500'}`}>
                                난이도 {oreum.diff || '미정'}
                            </span>
                            <span className="text-white/80 text-sm font-medium flex items-center gap-1">
                                <Icons.Map /> {oreum.loc}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-white">{oreum.name}</h2>
                    </div>
                </div>

                {/* 콘텐츠 영역 */}
                <div className="p-8 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-50 p-4 rounded-2xl">
                            <div className="text-gray-500 text-xs font-bold uppercase mb-1">표고 (높이)</div>
                            <div className="text-5xl font-black text-gray-900">{oreum.height || '0'}m</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Icons.Activity /> 개요
                            </h3>
                            <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                {oreum.desc || '정보가 없습니다.'}
                            </p>
                        </div>

                        {/* [3단계 핵심 수정 부분] 환경 지수 표시 영역 */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Icons.Sun /> 실시간 환경 지수 분석
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* NDWI */}
                                <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-lg text-2xl">💧</div>
                                    <div>
                                        <div className="text-xs font-bold text-blue-500 uppercase">질척임 (NDWI)</div>
                                        {(() => {
                                            const analysis = getOreumAnalysis('NDWI', typeof oreum.NDWI === 'number' ? oreum.NDWI : null);
                                            return (
                                                <>
                                                    <div className="font-black text-gray-800">{analysis.status}</div>
                                                    <div className="text-xs text-gray-500">{analysis.message}</div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* EVI */}
                                <div className="bg-green-50 p-4 rounded-xl flex items-center gap-3">
                                    <div className="bg-green-100 p-2 rounded-lg text-2xl">🌿</div>
                                    <div>
                                        <div className="text-xs font-bold text-green-500 uppercase">녹색도 (EVI)</div>
                                        {(() => {
                                            const analysis = getOreumAnalysis('EVI', typeof oreum.EVI === 'number' ? oreum.EVI : null);
                                            return (
                                                <>
                                                    <div className="font-black text-gray-800">{analysis.status}</div>
                                                    <div className="text-xs text-gray-500">{analysis.message}</div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* NMDI */}
                                <div className="bg-red-50 p-4 rounded-xl flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-lg text-2xl">🔥</div>
                                    <div>
                                        <div className="text-xs font-bold text-red-500 uppercase">화재위험 (NMDI)</div>
                                        {(() => {
                                            const analysis = getOreumAnalysis('NMDI', typeof oreum.NMDI === 'number' ? oreum.NMDI : null);
                                            return (
                                                <>
                                                    <div className="font-black text-gray-800">{analysis.status}</div>
                                                    <div className="text-xs text-gray-500">{analysis.message}</div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* BSI */}
                                <div className="bg-stone-50 p-4 rounded-xl flex items-center gap-3">
                                    <div className="bg-stone-100 p-2 rounded-lg text-2xl">⛰️</div>
                                    <div>
                                        <div className="text-xs font-bold text-stone-500 uppercase">훼손도 (BSI)</div>
                                        {(() => {
                                            const analysis = getOreumAnalysis('BSI', typeof oreum.BSI === 'number' ? oreum.BSI : null);
                                            return (
                                                <>
                                                    <div className="font-black text-gray-800">{analysis.status}</div>
                                                    <div className="text-xs text-gray-500">{analysis.message}</div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 오름 목록 페이지 컴포넌트
const OreumListPage = ({ onBack, oreums }: { onBack: () => void, oreums: Oreum[] }) => {
    const [filterType, setFilterType] = useState('all');
    const [selectedOreum, setSelectedOreum] = useState<Oreum | null>(null);
    
    // DB 데이터 사용 (oreums prop)
    const filteredData = useMemo(() => {
        if (!oreums) return [];
        let data = [...oreums];
        if (filterType === 'height') {
            data.sort((a, b) => (Number(b.height) || 0) - (Number(a.height) || 0));
        } else if (filterType === 'diff_high') {
            data = data.filter(d => String(d.diff || '').trim() === '상');
        } else if (filterType === 'diff_mid') {
            data = data.filter(d => String(d.diff || '').trim() === '중');
        } else if (filterType === 'diff_low') {
            data = data.filter(d => String(d.diff || '').trim() === '하');
        }
        return data;
    }, [oreums, filterType]);

    useEffect(() => {
        window.scrollTo(0, 0); // 페이지 이동 시 최상단으로 스크롤
    }, []);

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans animate-[fadeIn_0.3s_ease-out]">
            {/* Header */}
            <nav className="fixed w-full z-50 bg-white shadow-sm border-b border-gray-100 h-16 flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-colors">
                        <Icons.ArrowLeft /> 돌아가기
                    </button>
                    <div className="text-xl font-black tracking-tighter uppercase text-black flex items-center gap-2">
                        <Icons.Mountain /> 어디 오름?
                    </div>
                    <div className="w-20"></div> {/* Spacer for center alignment */}
                </div>
            </nav>

            <div className="pt-24 max-w-7xl mx-auto px-6 pb-20">
                <div className="mb-12 text-center">
                    <h2 className="text-4xl font-black text-gray-900 mb-4">제주 오름 탐험 지도</h2>
                    <p className="text-gray-500 text-lg">총 {oreums ? oreums.length : 0}개의 주요 오름 데이터베이스</p>
                </div>

                {/* Filters */}
                <div className="mb-8 flex flex-wrap gap-2 justify-center">
                    <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterType === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>전체보기</button>
                    <button onClick={() => setFilterType('height')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterType === 'height' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>높은순 🔼</button>
                    <button onClick={() => setFilterType('diff_high')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterType === 'diff_high' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>난이도 (상)</button>
                    <button onClick={() => setFilterType('diff_mid')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterType === 'diff_mid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>난이도 (중)</button>
                    <button onClick={() => setFilterType('diff_low')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterType === 'diff_low' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>난이도 (하)</button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-6 text-sm font-bold text-gray-500 uppercase whitespace-nowrap">오름명</th>
                                    <th className="p-6 text-sm font-bold text-gray-500 uppercase whitespace-nowrap">위치</th>
                                    <th className="p-6 text-sm font-bold text-gray-500 uppercase whitespace-nowrap">높이(m)</th>
                                    <th className="p-6 text-sm font-bold text-gray-500 uppercase whitespace-nowrap">난이도</th>
                                    <th className="p-6 text-sm font-bold text-gray-500 uppercase">특징</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.map((item, idx) => (
                                    <tr key={idx} onClick={() => setSelectedOreum(item)} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                                        <td className="p-6 font-bold text-gray-900 whitespace-nowrap">{item.name || '-'}</td>
                                        <td className="p-6 text-sm text-gray-600 whitespace-nowrap">{item.loc || '-'}</td>
                                        <td className="p-6 font-mono text-blue-600 font-bold whitespace-nowrap">{item.height || '0'}m</td>
                                        <td className="p-6 whitespace-nowrap">
                                            <span className={`px-3 py-1.5 rounded-md text-xs font-bold 
                                                ${String(item.diff || '').trim() === '상' ? 'bg-red-100 text-red-600' : String(item.diff || '').trim() === '중' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                                                {item.diff || '하'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-sm text-gray-500 max-w-md truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all duration-300" title={item.desc}>
                                            {item.desc || '정보 없음'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <OreumDetailModal oreum={selectedOreum} onClose={() => setSelectedOreum(null)} />
        </div>
    );
};

// 랜딩 페이지 컴포넌트
const LandingPage = ({ onNavigate, oreums }: { onNavigate: (view: string) => void, oreums: Oreum[] }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg py-3' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className={`text-2xl font-black tracking-tighter uppercase flex items-center gap-2 ${scrolled ? 'text-black' : 'text-white'}`}>
                        <Icons.Mountain /> 어디 오름?
                    </div>
                    <div className={`hidden md:flex space-x-8 text-sm font-bold ${scrolled ? 'text-gray-600' : 'text-white/80'}`}>
                        <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('list'); }} className="hover:text-blue-500 transition-colors">오름 목록 데이터베이스(오름에 대한 대략적인 정보가 궁금하면!)</a>
                    </div>
                    <div className="w-20 md:w-32"></div>
                </div>
            </nav>

            <section className="relative min-h-[90vh] flex items-center bg-black pt-20">
                <img src={backgroundOreum} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Background"/>
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>
                <div className="relative z-10 max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-5 gap-12 items-center">
                    <div className="lg:col-span-2">
                        <ScrollReveal>
                            <div className="flex items-center gap-2 text-blue-400 font-bold mb-6 animate-pulse-slow">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                LIVE SATELLITE STATUS
                            </div>
                            <h1 className="text-6xl md:text-7xl font-black text-white mb-8 leading-[1.1] tracking-tighter">JEJU<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">OREUM</span><br/>EXPLORER</h1>
                            <p className="text-xl text-gray-400 max-w-md font-light leading-relaxed">우주에서 바라본 제주의 숨결. <br/>위성 데이터가 안내하는 368개의 모험.</p>
                        </ScrollReveal>
                    </div>
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ScrollReveal delay={200}><StatCard label="현재 탐방객" value="1,248" sub="+12.5%" icon={Icons.Users} color="blue"/></ScrollReveal>
                        <ScrollReveal delay={400}><StatCard label="오늘 인증 완료" value="342" sub="LIVE" icon={Icons.Check} color="emerald"/></ScrollReveal>
                        <ScrollReveal delay={600}><StatCard label="실시간 쾌적 지수" value="0.67" sub="Sentinel BASED" icon={Icons.Sun} color="amber"/></ScrollReveal>
                        <ScrollReveal delay={800}><StatCard label="누적 적립 포인트" value="₩ 12.5M" sub="REWARD" icon={Icons.Coins} color="purple"/></ScrollReveal>
                    </div>
                </div>
            </section>

            <AIRecommendationSection oreums={oreums} />

            <section className="py-20 bg-gray-100 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 mb-10">
                    <ScrollReveal>
                        <h2 className="text-3xl font-black flex items-center gap-3">
                            <Icons.Camera /> LIVE FEED
                            <span className="text-sm font-normal text-gray-500 bg-white px-3 py-1 rounded-full">실시간 인증 현황</span>
                        </h2>
                    </ScrollReveal>
                </div>
                <ScrollReveal delay={200}>
                    <div className="flex scrolling-wrapper pb-10">
                        <UserFeedItem user="hiker_kim" loc="용눈이오름" time="방금 전" img="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400" />
                        <UserFeedItem user="jeju_lover" loc="성산일출봉" time="5분 전" img="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400" />
                        <UserFeedItem user="mountain_go" loc="한라산" time="12분 전" img="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400" />
                        <UserFeedItem user="oreum_master" loc="따라비오름" time="24분 전" img="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400" />
                        <UserFeedItem user="daily_walk" loc="노꼬메오름" time="30분 전" img="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400" />
                        <UserFeedItem user="newbie_01" loc="아부오름" time="42분 전" img="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=400" />
                        <UserFeedItem user="hiker_kim" loc="용눈이오름" time="방금 전" img="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400" />
                        <UserFeedItem user="jeju_lover" loc="성산일출봉" time="5분 전" img="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400" />
                    </div>
                </ScrollReveal>
            </section>

            <section className="py-24 bg-gray-900 text-white">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
                    <ScrollReveal>
                        <h2 className="text-4xl font-black mb-6 tracking-tighter">Sentinel-2를 활용한 실시간 오름 추천 서비스</h2>
                        <p className="text-gray-400 text-lg leading-relaxed mb-8 font-light">
                            우리는 위성 데이터를 통해 제주의 자연을 지키며 즐기는 방법을 연구합니다.
                            실시간 혼잡도 분석으로 탐방객을 분산시키고, Sentinel-1&2 위성 기반으로 오름을 모니터링합니다.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-4 text-xl font-bold">
                                <div className="bg-blue-600 p-2 rounded"><Icons.Activity /></div>
                                NDWI, NMDI, EVI, BSI 기반 오름 추천 AI
                            </li>
                            <li className="flex items-center gap-4 text-xl font-bold">
                                <div className="bg-emerald-600 p-2 rounded"><Icons.Map /></div>
                                NDWI, NMDI, EVI, BSI 기반 오름 의사결정 AI
                            </li>
                        </ul>
                    </ScrollReveal>
                    <ScrollReveal delay={300}>
                        <div className="relative">
                            <div className="absolute -inset-4 bg-blue-500/20 blur-xl rounded-full"></div>
                            <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2072" className="relative rounded-2xl shadow-2xl border border-white/10" alt="Features"/>
                        </div>
                    </ScrollReveal>
                </div>
            </section>

            <section className="py-24 bg-gradient-to-br from-indigo-900 to-blue-900 text-white overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"></div>
                </div>
                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <ScrollReveal>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8">
                            <span className="text-yellow-400"><Icons.Coins /></span>
                            <span className="text-sm font-bold text-yellow-100">BLOCKCHAIN REWARD SYSTEM</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                            오름 오르고<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">포인트</span>도 챙기세요
                        </h2>
                        <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-16 leading-relaxed">
                            Sentinel-2 위성 데이터와 GPS가 당신의 오름 등반을 자동으로 인증합니다.<br/>
                            적립된 포인트로 제주 특산품을 구매하거나 환경 보호 단체에 기부할 수 있습니다.
                        </p>
                    </ScrollReveal>

                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <ScrollReveal delay={200}>
                            <div className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group h-full">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-300 mb-6 group-hover:scale-110 transition-transform">
                                    <Icons.Map />
                                </div>
                                <h3 className="text-xl font-bold mb-3">자동 등반 인증</h3>
                                <p className="text-blue-200/60 text-sm leading-relaxed">위치 기반 서비스와 위성 영상을 분석하여 별도 절차 없이 방문을 인증합니다.</p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={400}>
                            <div className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group h-full">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-300 mb-6 group-hover:scale-110 transition-transform">
                                    <Icons.Coins />
                                </div>
                                <h3 className="text-xl font-bold mb-3">실시간 적립</h3>
                                <p className="text-blue-200/60 text-sm leading-relaxed">난이도와 혼잡도에 따라 차등 지급되는 포인트를 실시간으로 확인하세요.</p>
                            </div>
                        </ScrollReveal>
                        <ScrollReveal delay={600}>
                            <div className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors group h-full">
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-300 mb-6 group-hover:scale-110 transition-transform">
                                    <Icons.Award />
                                </div>
                                <h3 className="text-xl font-bold mb-3">가치 있는 소비</h3>
                                <p className="text-blue-200/60 text-sm leading-relaxed">지역 상권에서 현금처럼 사용하거나 제주의 자연을 위해 기부하세요.</p>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>
            </section>

            <footer className="bg-black text-gray-500 py-12 px-6 border-t border-gray-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <div className="text-white text-2xl font-black uppercase mb-2 tracking-tighter">어디 오름?</div>
                        <p className="text-sm">Jeju Global Space Challenge - Team SAM SEUNG</p>
                    </div>
                    <div className="flex gap-6 text-sm">
                        <a href="#" className="hover:text-white transition-colors">이용약관</a>
                        <a href="#" className="hover:text-white transition-colors">개인정보처리방침</a>
                        <a href="#" className="hover:text-white transition-colors">문의하기</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// CSV 파싱 유틸리티 함수
const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(','); // 간단한 파싱 (따옴표 안에 콤마가 없다고 가정)
        const obj: any = {};
        headers.forEach((header, index) => {
            obj[header.trim()] = values[index] ? values[index].trim() : '';
        });
        return obj;
    });
};

// 메인 앱 컴포넌트
const App = () => {
    const [view, setView] = useState('home'); // 'home' | 'list'
    const [oreums, setOreums] = useState<Oreum[]>([]);

    useEffect(() => {
        const fetchOreums = async () => {
            let finalData: Oreum[] = [];
            let isSupabaseSuccess = false;

            // 1. Supabase 데이터 시도
            if (supabase) {
                try {
                    console.log("Fetching data from Supabase...");
                    const [metaResult, statsResult] = await Promise.all([
                        supabase.from('oreum_metadata').select('*'),
                        supabase.from('oreum_daily_stats').select('*')
                    ]);

                    if (metaResult.data && metaResult.data.length > 0) {
                        const statsMap: any = {};
                        if (statsResult.data) {
                            statsResult.data.forEach(stat => {
                                const id = stat.oreum_id || stat.id;
                                statsMap[id] = stat;
                            });
                        }

                        finalData = metaResult.data.map((item: any) => {
                            // 다국어/다양한 컬럼명 대응
                            const getVal = (obj: any, keys: string[]) => {
                                if (!obj) return null;
                                for (let k of keys) {
                                    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
                                }
                                return null;
                            };

                            const id = getVal(item, ['id', '연번', 'ID', 'no']);
                            const stat = statsMap[id] || {};

                            return {
                                id: id,
                                name: getVal(item, ['name']),
                                // UI 컴포넌트가 사용하는 키로 매핑
                                loc: getVal(item, ['address', 'loc', '소재지']),
                                height: getVal(item, ['altitude', 'height', '표고']),
                                diff: getVal(item, ['difficulty', 'diff', '난이도']),
                                desc: getVal(item, ['overview', 'desc', '개요', 'description']),
                                remark: getVal(item, ['remark', '비고']),
                                
                                x_coord: getVal(item, ['x_coord']),
                                y_coord: getVal(item, ['y_coord']),
                                address: getVal(item, ['address']),
                                altitude: getVal(item, ['altitude']),
                                area: getVal(item, ['area']),
                                form: getVal(item, ['form']),
                                difficulty: getVal(item, ['difficulty']),
                            
                                // 위성 분석 지수 매핑 (Supabase -> App)
                                NDWI: getVal(stat, ['muddy_index', 'NDWI', 'ndwi']),      // 질척임
                                EVI: getVal(stat, ['green_visual_index', 'EVI', 'evi']),  // 녹색도
                                NMDI: getVal(stat, ['fire_risk_index', 'NMDI', 'nmdi']),   // 화재위험
                                BSI: getVal(stat, ['erosion_index', 'BSI', 'bsi'])         // 침식/훼손
                            };
                        });
                        isSupabaseSuccess = true;
                        console.log(`Loaded ${finalData.length} items from Supabase.`);
                    }
                } catch (err) {
                    console.error("Supabase fetch error:", err);
                }
            }

            // 2. 실패하거나 데이터가 없으면 CSV Fallback 사용
            if (!isSupabaseSuccess || finalData.length === 0) {
                console.warn("Using Fallback CSV Data");
                const parsed = parseCSV(OREUM_DATA);
                finalData = parsed.map((item: any, idx: number) => ({
                    id: item['연번'] || idx,
                    name: item['오름명'],
                    loc: item['소재지'],
                    desc: item['개요'],
                    height: item['표고'],
                    remark: item['비고'],
                    diff: item['난이도'],
                    // CSV에는 환경 지수가 없으므로 null 또는 기본값
                    NDWI: null, EVI: null, NMDI: null, BSI: null
                }));
            }

            setOreums(finalData);
        };

        fetchOreums();
    }, []);

    return (
        <>
            {view === 'home' && <LandingPage onNavigate={setView} oreums={oreums} />}
            {view === 'list' && <OreumListPage onBack={() => setView('home')} oreums={oreums} />}
        </>
    );
};

export default App;