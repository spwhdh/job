// 전역 변수
let zoomLevel = 1;
let currentSelection = null;
let savedRange = null; // 텍스트 선택 영역 저장
let floatingToolbar = null;

// 실행 취소/다시 실행을 위한 히스토리
let undoHistory = [];
let redoHistory = [];
let maxHistorySize = 30;
let isRestoringHistory = false;

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 플로팅 툴바 초기화
    initFloatingToolbar();
    
    // 디폴트 값 설정
    const defaultValues = {
        'requirements-note': `핫셀러는 성공을 위해 누구보다 노력할 수 있는 분들을 위해
인센티브, 지분 증여 등 성과에 따른 보상과 다양한 복지 혜택이 주어집니다.
하지만 목표 달성을 위해 높은 업무 강도와 잦은 야근이 요구되며,
꾸준한 직무 역량 개발이 필수적입니다. 워라밸을 중시하거나 공무원과 같은
안정적인 직장을 선호하는 분에게 맞지 않을 수 있습니다.
이런 점을 감안했을 때,
지원자분께서 우리 회사와 잘 어울린다고 생각하시나요?`,
        'work-hours': '오전 9시 30분 ~ 오후 6시 30분',
        'work-location': '서울특별시 동대문구 장한로6 605호',
        'salary-info': '면접 후 협의 (직전연봉 or 희망연봉 필수 기재)',
        'additional-info': `- 포트폴리오 필수 첨부 (누락 시 서류 심사에서 자동 불합격)
- 허위 사실이 발견되는 경우 채용이 취소될 수 있습니다.`
    };
    
    // 부서 드롭다운 초기화
    updateDepartmentDropdown();
    
    // 부서 선택 드롭다운 이벤트 연결
    const departmentSelect = document.getElementById('department');
    if (departmentSelect) {
        // 저장된 부서 값 복원
        const savedDepartment = localStorage.getItem('department');
        if (savedDepartment) {
            departmentSelect.value = savedDepartment;
        }
        
        // 부서 변경 시 저장 및 이미지 업데이트
        departmentSelect.addEventListener('change', function() {
            localStorage.setItem('department', this.value);
            updateImagesBasedOnDepartment(); // 이미지 업데이트
        });
    }
    
    // 페이지 로드 시 초기 이미지 설정
    updateImagesBasedOnDepartment();
    
    // 부서 입력란 Enter 키 이벤트
    const newDeptInput = document.getElementById('newDepartmentInput');
    if (newDeptInput) {
        newDeptInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addDepartment();
            }
        });
    }
    
    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('departmentModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDepartmentModal();
            }
        });
    }
    
    // 모든 textarea에 실시간 업데이트 이벤트 연결
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            updatePreview(this.id);
            
            // 히스토리 저장 (디바운스)
            clearTimeout(textarea.historyTimeout);
            textarea.historyTimeout = setTimeout(() => {
                saveHistoryState();
            }, 500);
        });
        
        // 초기 로드 시 저장된 데이터가 있으면 복원, 없으면 디폴트 값 사용
        const savedValue = localStorage.getItem(textarea.id);
        if (savedValue) {
            textarea.value = savedValue;
            updatePreview(textarea.id);
        } else if (defaultValues[textarea.id]) {
            // 디폴트 값이 있는 경우 설정
            textarea.value = defaultValues[textarea.id];
            updatePreview(textarea.id);
        }
    });
    
    // 미리보기 직접 편집 기능 활성화
    enableDirectEdit();
    
    // 저장된 스타일 복원
    setTimeout(() => {
        restorePreviewStyles();
        
        // 디폴트 HTML 값 적용 (저장된 값이 없을 때만)
        applyDefaultHTMLValues();
    }, 100);
    
    // 초기 상태를 히스토리에 저장
    setTimeout(() => {
        saveHistoryState();
    }, 200);
    
    // 자동 저장 기능
    setInterval(autoSave, 5000); // 5초마다 자동 저장
    
    // 미리보기 스크롤을 맨 위로 설정 (공고 제목이 먼저 보이도록)
    // 즉시 실행 + 여러 시점에서 실행하여 확실하게 맨 위로 이동
    scrollPreviewToTop();
    setTimeout(scrollPreviewToTop, 100);
    setTimeout(scrollPreviewToTop, 300);
    setTimeout(scrollPreviewToTop, 500);
});

// 미리보기 패널을 공고 제목 섹션으로 스크롤하는 함수
function scrollPreviewToTop() {
    const previewScroll = document.querySelector('.preview-scroll');
    const topImage = document.querySelector('.top-image');
    if (previewScroll && topImage) {
        // 상단 이미지 높이만큼 스크롤하여 공고 제목이 화면 상단에 보이도록
        previewScroll.scrollTop = topImage.offsetHeight;
    }
}

// 미리보기 업데이트 함수
function updatePreview(fieldId) {
    const input = document.getElementById(fieldId);
    const previewId = 'preview-' + fieldId;
    const preview = document.getElementById(previewId);
    
    if (!input || !preview) return;
    
    const text = input.value.trim();
    
    // 공고 제목 처리
    if (fieldId === 'job-title') {
        if (text === '') {
            preview.textContent = '공고 제목을 입력하세요';
        } else {
            // 줄바꿈을 <br> 태그로 변환
            const lines = text.split('\n');
            const html = lines.map(line => escapeHtml(line)).join('<br>');
            preview.innerHTML = html;
        }
        return;
    }
    
    // 자격 요건 추가 설명 박스 처리
    if (fieldId === 'requirements-note') {
        if (text === '') {
            preview.innerHTML = '';
            preview.style.display = 'none';
            return;
        }
        
        // 박스 표시
        preview.style.display = 'block';
        
        const lines = text.split('\n').filter(line => line.trim() !== '');
        let html = '';
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            let processedLine = escapeHtml(trimmedLine);
            
            // "하지만"으로 시작하는 문장 강조
            if (trimmedLine.startsWith('하지만')) {
                processedLine = `<strong>${processedLine}</strong>`;
            }
            
            html += `<p>${processedLine}</p>`;
        });
        
        preview.innerHTML = html;
        return;
    }
    
    // 근무 시간 처리
    if (fieldId === 'work-hours') {
        const preview = document.getElementById('preview-work-hours');
        if (!preview) return;
        
        if (text === '') {
            preview.textContent = '오전 9시 30분 ~ 오후 6시 30분'; // 기본값
        } else {
            preview.textContent = text;
        }
        return;
    }
    
    // 근무지 처리
    if (fieldId === 'work-location') {
        const preview = document.getElementById('preview-work-location');
        if (!preview) return;
        
        if (text === '') {
            preview.textContent = '서울특별시 동대문구 장한로6 605호'; // 기본값
        } else {
            preview.textContent = text;
        }
        return;
    }
    
    // 연봉 및 고용 형태 처리
    if (fieldId === 'salary-info') {
        const preview = document.getElementById('preview-salary-info');
        if (!preview) return;
        
        if (text === '') {
            preview.innerHTML = '<span class="highlight-text"><span class="blue-text">면접 후 협의</span> (직전연봉 or 희망연봉 필수 기재)</span>'; // 기본값
        } else {
            preview.innerHTML = `<span class="highlight-text">${escapeHtml(text)}</span>`;
        }
        return;
    }
    
    // 일반 리스트 형식 처리
    if (text === '') {
        preview.innerHTML = '<p class="placeholder-text">내용을 입력해주세요</p>';
        return;
    }
    
    // 줄바꿈을 기준으로 분리하여 리스트 생성
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
        preview.innerHTML = '<p class="placeholder-text">내용을 입력해주세요</p>';
        return;
    }
    
    // HTML 생성
    let html = '<ul>';
    lines.forEach(line => {
        const trimmedLine = line.trim();
        // 이미 • 또는 - 로 시작하는 경우 그대로 사용
        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
            html += `<li>${escapeHtml(trimmedLine.substring(1).trim())}</li>`;
        } else {
            html += `<li>${escapeHtml(trimmedLine)}</li>`;
        }
    });
    html += '</ul>';
    
    preview.innerHTML = html;
}

// HTML 이스케이프 함수 (XSS 방지)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 자동 저장 함수
function autoSave() {
    // 부서 선택 저장
    const departmentSelect = document.getElementById('department');
    if (departmentSelect) {
        localStorage.setItem('department', departmentSelect.value);
    }
    
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        localStorage.setItem(textarea.id, textarea.value);
    });
    
    // 미리보기 영역의 스타일이 적용된 HTML도 저장
    savePreviewStyles();
    
    console.log('자동 저장 완료:', new Date().toLocaleTimeString());
}

// 미리보기 스타일 저장
function savePreviewStyles() {
    const editableFields = [
        'preview-job-title',
        'preview-recommend',
        'preview-duties',
        'preview-requirements',
        'preview-preferred',
        'preview-requirements-note',
        'preview-salary-info',
        'preview-additional-info'
    ];
    
    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            localStorage.setItem(fieldId + '-html', element.innerHTML);
        }
    });
}

// 미리보기 스타일 복원
function restorePreviewStyles() {
    const editableFields = [
        'preview-job-title',
        'preview-recommend',
        'preview-duties',
        'preview-requirements',
        'preview-preferred',
        'preview-requirements-note',
        'preview-salary-info',
        'preview-additional-info'
    ];
    
    editableFields.forEach(fieldId => {
        const savedHTML = localStorage.getItem(fieldId + '-html');
        if (savedHTML) {
            const element = document.getElementById(fieldId);
            if (element && !element.querySelector('.placeholder-text')) {
                // 플레이스홀더가 아닌 경우에만 복원
                element.innerHTML = savedHTML;
            }
        }
    });
}

// 디폴트 HTML 값 적용 (처음 로드 시에만)
function applyDefaultHTMLValues() {
    const STYLE_VERSION = '1.5'; // 스타일 버전 (스타일 변경 시 증가)
    const defaultHTMLValues = {
        'preview-requirements-note': `<p>핫셀러는 성공을 위해 누구보다 노력할 수 있는 분들을 위해</p><p>인센티브, 지분 증여 등 성과에 따른 보상과 다양한 복지 혜택이 주어집니다.</p><p><strong>하지만 목표 달성을 위해 높은 업무 강도와 잦은 야근이 요구되며,</strong></p><p>꾸준한 직무 역량 개발이 필수적입니다. 워라밸을 중시하거나 공무원과 같은</p><p>안정적인 직장을 선호하는 분에게 맞지 않을 수 있습니다.</p><p><span class="fixed-color" style="color: #0062E0; font-weight: bold;">이런 점을 감안했을 때,</span></p><p><span class="fixed-color" style="color: #0062E0; font-weight: bold;">지원자분께서 우리 회사와 잘 어울린다고 생각하시나요?</span></p>`,
        'preview-additional-info': `<ul><li>포트폴리오 필수 첨부 (누락 시 서류 심사에서 자동 불합격)</li><li>허위 사실이 발견되는 경우 채용이 취소될 수 있습니다.</li></ul>`
    };
    
    // 저장된 스타일 버전 확인
    const savedVersion = localStorage.getItem('style-version');
    
    // 버전이 다르면 저장된 HTML 삭제
    if (savedVersion !== STYLE_VERSION) {
        localStorage.removeItem('preview-requirements-note-html');
        localStorage.removeItem('preview-additional-info-html');
        localStorage.setItem('style-version', STYLE_VERSION);
        console.log('스타일 버전 업데이트:', STYLE_VERSION);
    }
    
    Object.keys(defaultHTMLValues).forEach(fieldId => {
        // 저장된 HTML이 없고, 입력 필드에 디폴트 값이 있는 경우에만 적용
        const savedHTML = localStorage.getItem(fieldId + '-html');
        const element = document.getElementById(fieldId);
        
        if (!savedHTML && element) {
            const inputId = fieldId.replace('preview-', '');
            const input = document.getElementById(inputId);
            
            // 입력 필드에 디폴트 값이 있고, 저장된 HTML이 없으면 디폴트 HTML 적용
            if (input && input.value && !savedHTML) {
                element.innerHTML = defaultHTMLValues[fieldId];
                element.style.display = 'block';
            }
        }
    });
}

// 줌 인 함수
function zoomIn() {
    if (zoomLevel < 1.5) {
        zoomLevel += 0.1;
        applyZoom();
    }
}

// 줌 아웃 함수
function zoomOut() {
    if (zoomLevel > 0.5) {
        zoomLevel -= 0.1;
        applyZoom();
    }
}

// 줌 적용 함수
function applyZoom() {
    const preview = document.getElementById('preview');
    preview.style.transform = `scale(${zoomLevel})`;
    document.getElementById('zoom-level').textContent = Math.round(zoomLevel * 100) + '%';
}

// 이미지 다운로드 함수
async function downloadImage() {
    // 다운로드 중임을 알림
    const btn = document.querySelector('.download-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ 생성 중...';
    btn.disabled = true;
    
    try {
        // html2canvas 라이브러리가 필요합니다
        // CDN을 통해 동적으로 로드
        if (typeof html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        
        const element = document.getElementById('preview');
        
        // 이미지가 모두 로드될 때까지 대기
        const images = element.querySelectorAll('img');
        const imageLoadPromises = Array.from(images).map(img => {
            if (img.complete) {
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        });
        
        await Promise.all(imageLoadPromises);
        console.log('✅ 모든 이미지 로드 완료');
        
        const originalTransform = element.style.transform;
        element.style.transform = 'scale(1)'; // 다운로드 시 원본 크기로
        
        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2, // 안정적인 고해상도
            logging: false,
            useCORS: false, // 로컬 이미지용
            allowTaint: true
        });
        
        element.style.transform = originalTransform; // 원래 줌 레벨로 복원
        
        // 가로 900px로 리사이즈
        const targetWidth = 900;
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const targetHeight = Math.round((originalHeight * targetWidth) / originalWidth);
        
        // 새 캔버스 생성
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = targetWidth;
        resizedCanvas.height = targetHeight;
        const ctx = resizedCanvas.getContext('2d');
        
        // 고품질 리사이징
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        
        // 리사이즈된 캔버스를 이미지로 변환
        resizedCanvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date();
            const filename = `채용공고_${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}_${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}.png`;
            
            link.href = url;
            link.download = filename;
            link.click();
            
            URL.revokeObjectURL(url);
            
            btn.textContent = originalText;
            btn.disabled = false;
            alert('✅ 이미지가 다운로드되었습니다! (900px 가로)');
        });
        
    } catch (error) {
        console.error('이미지 생성 실패:', error);
        alert('❌ 이미지 생성에 실패했습니다. 콘솔을 확인해주세요.');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// 이미지 업로드 및 링크 복사 (여러 서비스 시도 + 폴백)
async function copyImageLink() {
    const btn = document.querySelector('.copy-link-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ 업로드 중...';
    btn.disabled = true;
    
    try {
        // html2canvas 라이브러리 로드
        if (typeof html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        
        const element = document.getElementById('preview');
        
        // 이미지가 모두 로드될 때까지 대기
        const images = element.querySelectorAll('img');
        const imageLoadPromises = Array.from(images).map(img => {
            if (img.complete) {
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        });
        
        await Promise.all(imageLoadPromises);
        console.log('✅ 모든 이미지 로드 완료');
        
        const originalTransform = element.style.transform;
        element.style.transform = 'scale(1)';
        
        // 캔버스 생성
        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2, // 안정적인 고해상도
            logging: false,
            useCORS: false, // 로컬 이미지용
            allowTaint: true
        });
        
        element.style.transform = originalTransform;
        
        // 가로 900px로 리사이즈
        const targetWidth = 900;
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        const targetHeight = Math.round((originalHeight * targetWidth) / originalWidth);
        
        // 새 캔버스 생성
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = targetWidth;
        resizedCanvas.height = targetHeight;
        const ctx = resizedCanvas.getContext('2d');
        
        // 고품질 리사이징
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        
        // 리사이즈된 캔버스를 Blob과 Base64로 변환
        const blob = await new Promise(resolve => resizedCanvas.toBlob(resolve, 'image/png'));
        const base64 = resizedCanvas.toDataURL('image/png');
        
        // 방법 1: freeimage.host 시도
        try {
            btn.textContent = '⏳ 업로드 중... (1/3)';
            const formData1 = new FormData();
            formData1.append('source', blob);
            formData1.append('type', 'file');
            formData1.append('action', 'upload');
            
            const response1 = await fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
                method: 'POST',
                body: formData1
            });
            
            const data1 = await response1.json();
            if (data1.success && data1.image && data1.image.url) {
                await navigator.clipboard.writeText(data1.image.url);
                btn.textContent = '✅ 복사 완료!';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
                alert(`✅ 이미지 링크가 클립보드에 복사되었습니다!\n\n${data1.image.url}`);
                return;
            }
        } catch (e) {
            console.log('freeimage.host 실패, 다음 시도...');
        }
        
        // 방법 2: catbox.moe 시도
        try {
            btn.textContent = '⏳ 업로드 중... (2/3)';
            const formData2 = new FormData();
            formData2.append('reqtype', 'fileupload');
            formData2.append('fileToUpload', blob, 'recruitment.png');
            
            const response2 = await fetch('https://catbox.moe/user/api.php', {
                method: 'POST',
                body: formData2
            });
            
            const imageUrl = await response2.text();
            if (imageUrl && imageUrl.startsWith('https://')) {
                await navigator.clipboard.writeText(imageUrl.trim());
                btn.textContent = '✅ 복사 완료!';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
                alert(`✅ 이미지 링크가 클립보드에 복사되었습니다!\n\n${imageUrl.trim()}`);
                return;
            }
        } catch (e) {
            console.log('catbox.moe 실패, 다음 시도...');
        }
        
        // 방법 3: Base64 데이터 URL 복사 (폴백 - 항상 작동)
        btn.textContent = '⏳ 처리 중... (3/3)';
        await navigator.clipboard.writeText(base64);
        
        btn.textContent = '✅ 복사 완료!';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
        
        alert('⚠️ 외부 업로드 실패로 Base64 이미지 데이터를 복사했습니다.\n\n이 데이터를 HTML의 <img> 태그 src에 직접 붙여넣으면 이미지가 표시됩니다.\n\n예: <img src="복사된_데이터">');
        
    } catch (error) {
        console.error('이미지 생성 실패:', error);
        alert('❌ 이미지 생성에 실패했습니다: ' + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// 스크립트 동적 로드 함수
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 데이터 초기화 함수
function clearAll() {
    if (confirm('⚠️ 모든 내용을 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.value = '';
            localStorage.removeItem(textarea.id);
            updatePreview(textarea.id);
        });
        alert('✅ 모든 내용이 초기화되었습니다.');
    }
}

// 키보드 단축키
document.addEventListener('keydown', function(e) {
    // Ctrl + S: 수동 저장
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        autoSave();
        alert('💾 저장되었습니다!');
    }
    
    // Ctrl + D: 다운로드
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        downloadImage();
    }
    
    // Ctrl + B: 굵게
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        applyFormat('bold');
    }
    
    // Ctrl + U: 밑줄
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        applyFormat('underline');
    }
    
    // Ctrl + Z: 실행 취소
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        const activeElement = document.activeElement;
        // textarea 또는 editable-content에서 작동
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.closest('.editable-content'))) {
            e.preventDefault();
            undo();
        }
    }
    
    // Ctrl + Y 또는 Ctrl + Shift + Z: 다시 실행
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        const activeElement = document.activeElement;
        // textarea 또는 editable-content에서 작동
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.closest('.editable-content'))) {
            e.preventDefault();
            redo();
        }
    }
    
    // Ctrl + A: 전체 선택 (편집 가능 영역 내에서만)
    if (e.ctrlKey && e.key === 'a') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.closest('.editable-content')) {
            e.preventDefault();
            selectAllInElement(activeElement);
        }
    }
});

// 미리보기 직접 편집 기능
function enableDirectEdit() {
    const editableFields = [
        { previewId: 'preview-job-title', inputId: 'job-title' },
        { previewId: 'preview-recommend', inputId: 'recommend' },
        { previewId: 'preview-duties', inputId: 'duties' },
        { previewId: 'preview-requirements', inputId: 'requirements' },
        { previewId: 'preview-preferred', inputId: 'preferred' },
        { previewId: 'preview-requirements-note', inputId: 'requirements-note' },
        { previewId: 'preview-work-hours', inputId: 'work-hours' },
        { previewId: 'preview-work-location', inputId: 'work-location' },
        { previewId: 'preview-salary-info', inputId: 'salary-info' },
        { previewId: 'preview-additional-info', inputId: 'additional-info' }
    ];
    
    editableFields.forEach(field => {
        const preview = document.getElementById(field.previewId);
        const input = document.getElementById(field.inputId);
        
        if (!preview || !input) return;
        
        // contenteditable 활성화
        preview.contentEditable = true;
        preview.setAttribute('data-input-id', field.inputId);
        preview.setAttribute('spellcheck', 'false');
        
        // 포커스 시 스타일 추가 및 플레이스홀더 제거
        preview.addEventListener('focus', function() {
            this.classList.add('editable-mode');
            
            // 초기 상태 저장
            saveHistoryState();
            
            // 플레이스홀더 텍스트가 있으면 지우기
            const placeholder = this.querySelector('.placeholder-text');
            if (placeholder) {
                this.innerHTML = '';
                // requirements-note인 경우 단락 형식으로 시작
                if (field.inputId === 'requirements-note') {
                    this.innerHTML = '<p><br></p>';
                } else {
                    // 리스트 형식으로 시작
                    this.innerHTML = '<ul><li><br></li></ul>';
                }
            }
        });
        
        // 블러 시 스타일 제거 및 입력 폼 업데이트
        preview.addEventListener('blur', function() {
            this.classList.remove('editable-mode');
            syncToInput(field.inputId, field.previewId);
        });
        
        // 입력 시 히스토리 저장 (디바운스 적용)
        let inputTimeout;
        preview.addEventListener('input', function() {
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(() => {
                saveHistoryState();
            }, 500); // 0.5초 후 저장
        });
        
        // 붙여넣기 이벤트 처리
        preview.addEventListener('paste', function(e) {
            // 기본 붙여넣기 동작 방지
            e.preventDefault();
            
            // 클립보드에서 텍스트 가져오기
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            
            // 현재 선택 영역에 텍스트 삽입
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            // 텍스트를 HTML로 변환 (줄바꿈 유지)
            const lines = text.split('\n');
            const fragment = document.createDocumentFragment();
            
            lines.forEach((line, index) => {
                const textNode = document.createTextNode(line);
                fragment.appendChild(textNode);
                
                if (index < lines.length - 1) {
                    fragment.appendChild(document.createElement('br'));
                }
            });
            
            range.insertNode(fragment);
            
            // 커서를 삽입된 내용 끝으로 이동
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 히스토리 저장
            setTimeout(() => saveHistoryState(), 100);
        });
    });
}

// 미리보기 내용을 입력 폼으로 동기화
function syncToInput(inputId, previewId) {
    const preview = document.getElementById(previewId);
    const input = document.getElementById(inputId);
    
    if (!preview || !input) return;
    
    // 플레이스홀더인 경우 무시
    const placeholder = preview.querySelector('.placeholder-text');
    if (placeholder) {
        return;
    }
    
    // 공고 제목, 근무 시간, 근무지, 연봉 정보는 텍스트 그대로 동기화
    if (inputId === 'job-title' || inputId === 'work-hours' || inputId === 'work-location' || inputId === 'salary-info') {
        input.value = preview.textContent.trim();
        localStorage.setItem(inputId, input.value);
        return;
    }
    
    // requirements-note 특별 처리
    if (inputId === 'requirements-note') {
        const paragraphs = preview.querySelectorAll('p');
        const lines = [];
        paragraphs.forEach(p => {
            const text = p.textContent.trim();
            if (text && text !== '내용을 입력해주세요') {
                lines.push(text);
            }
        });
        input.value = lines.join('\n');
    } else {
        // 리스트 형식 처리
        const items = preview.querySelectorAll('li');
        const lines = [];
        items.forEach(item => {
            const text = item.textContent.trim();
            if (text) lines.push(text);
        });
        input.value = lines.join('\n');
    }
    
    // 내용이 비어있으면 플레이스홀더 다시 표시
    if (input.value.trim() === '') {
        preview.innerHTML = '<p class="placeholder-text">내용을 입력해주세요</p>';
    }
    
    // 로컬 스토리지에 저장
    localStorage.setItem(inputId, input.value);
}

// ============ 플로팅 툴바 기능 ============

// 플로팅 툴바 초기화
function initFloatingToolbar() {
    floatingToolbar = document.getElementById('floatingToolbar');
    const previewPanel = document.querySelector('.preview-scroll');
    
    if (!floatingToolbar || !previewPanel) return;
    
    // 텍스트 선택 이벤트
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // 툴바 버튼 이벤트
    document.getElementById('boldBtn').addEventListener('click', () => applyFormat('bold'));
    document.getElementById('underlineBtn').addEventListener('click', () => applyFormat('underline'));
    
    // 폰트 변경
    const fontFamilySelect = document.getElementById('fontFamily');
    fontFamilySelect.addEventListener('mousedown', (e) => {
        // 드롭다운 열 때 Range 저장
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
            currentSelection = selection;
        }
    });
    fontFamilySelect.addEventListener('change', (e) => {
        applyStyle('fontFamily', e.target.value);
        // 사용 후 Range 초기화
        setTimeout(() => {
            savedRange = null;
        }, 200);
    });
    
    // 폰트 크기 변경
    const fontSizeInput = document.getElementById('fontSize');
    fontSizeInput.addEventListener('mousedown', (e) => {
        // 텍스트 선택이 해제되지 않도록 Range 저장
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
            currentSelection = selection;
        }
    });
    fontSizeInput.addEventListener('focus', (e) => {
        // 포커스 시에도 Range 저장
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !savedRange) {
            savedRange = selection.getRangeAt(0).cloneRange();
            currentSelection = selection;
        }
    });
    fontSizeInput.addEventListener('change', (e) => {
        applyStyle('fontSize', e.target.value + 'px');
        // 사용 후 Range 초기화
        setTimeout(() => {
            savedRange = null;
        }, 200);
    });
    
    // 텍스트 색상
    const textColorInput = document.getElementById('textColor');
    textColorInput.addEventListener('mousedown', (e) => {
        // 색상 선택기 열 때 Range 저장
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
            currentSelection = selection;
        }
    });
    textColorInput.addEventListener('change', (e) => {
        applyStyle('color', e.target.value);
        // 사용 후 Range 초기화
        setTimeout(() => {
            savedRange = null;
        }, 200);
    });
    
    // 배경색
    const bgColorInput = document.getElementById('bgColor');
    bgColorInput.addEventListener('mousedown', (e) => {
        // 색상 선택기 열 때 Range 저장
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0).cloneRange();
            currentSelection = selection;
        }
    });
    bgColorInput.addEventListener('change', (e) => {
        applyStyle('backgroundColor', e.target.value);
        // 사용 후 Range 초기화
        setTimeout(() => {
            savedRange = null;
        }, 200);
    });
    
    // 텍스트 색상 제거 버튼
    document.getElementById('textColorNone').addEventListener('click', () => {
        removeTextColor();
    });
    
    // 배경색 제거 버튼
    document.getElementById('bgColorNone').addEventListener('click', () => {
        removeBackgroundColor();
    });
    
    // 다른 곳 클릭하면 툴바 숨김 (색상 선택기 제외)
    document.addEventListener('mousedown', (e) => {
        // 툴바 내부를 클릭한 경우
        if (floatingToolbar.contains(e.target)) {
            return;
        }
        
        // 편집 가능 영역을 클릭한 경우
        if (e.target.closest('.editable-content')) {
            return;
        }
        
        // 색상 선택기 팝업 내부를 클릭한 경우 (브라우저 네이티브 color picker)
        // color input 요소의 경우 클릭해도 툴바 유지
        if (e.target.type === 'color' || e.target.closest('input[type="color"]')) {
            return;
        }
        
        // 그 외의 경우 툴바 숨김
        hideToolbar();
    });
}

// 텍스트 선택 감지
function handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // 편집 가능 영역 내에서 텍스트가 선택되었는지 확인
    if (selectedText.length > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // 부모 요소 중 editable-content가 있는지 확인
        let parent = container.nodeType === 3 ? container.parentElement : container;
        while (parent) {
            if (parent.classList && parent.classList.contains('editable-content')) {
                currentSelection = selection;
                showToolbar(e);
                return;
            }
            parent = parent.parentElement;
        }
    }
    
    // 선택된 텍스트가 없으면 툴바 숨김
    hideToolbar();
}

// 선택 변경 감지
function handleSelectionChange() {
    // 툴바는 선택이 해제되어도 자동으로 숨기지 않음
    // 사용자가 빈 화면(외부)을 클릭할 때만 mousedown 이벤트 핸들러에서 툴바가 숨겨짐
    // 이렇게 하면 툴바 버튼을 클릭할 때 툴바가 계속 유지됨
}

// 툴바 표시
function showToolbar(e) {
    if (!floatingToolbar) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 툴바 위치 계산
    const toolbarWidth = 400; // 예상 툴바 너비
    const toolbarHeight = 50; // 예상 툴바 높이
    
    let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
    let top = rect.top - toolbarHeight - 10;
    
    // 화면 밖으로 나가지 않도록 조정
    if (left < 10) left = 10;
    if (left + toolbarWidth > window.innerWidth - 10) {
        left = window.innerWidth - toolbarWidth - 10;
    }
    
    // 위쪽 공간이 부족하면 아래에 표시
    if (top < 10) {
        top = rect.bottom + 10;
    }
    
    floatingToolbar.style.left = left + 'px';
    floatingToolbar.style.top = top + window.scrollY + 'px';
    floatingToolbar.classList.add('show');
    
    // 현재 스타일 반영
    updateToolbarState();
}

// 툴바 숨김
function hideToolbar() {
    if (floatingToolbar) {
        floatingToolbar.classList.remove('show');
    }
}

// 현재 선택 영역의 스타일 상태를 툴바에 반영
function updateToolbarState() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer;
    
    if (element.nodeType === 3) {
        element = element.parentElement;
    }
    
    const computedStyle = window.getComputedStyle(element);
    
    // 굵게 상태 확인
    const isBold = document.queryCommandState('bold') || 
                   computedStyle.fontWeight >= 600;
    document.getElementById('boldBtn').classList.toggle('active', isBold);
    
    // 밑줄 상태 확인
    const isUnderline = document.queryCommandState('underline');
    document.getElementById('underlineBtn').classList.toggle('active', isUnderline);
    
    // 텍스트 색상 확인
    const textColor = rgbToHex(computedStyle.color);
    if (textColor) {
        document.getElementById('textColor').value = textColor;
    }
    
    // 배경색 확인
    const bgColor = computedStyle.backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        const bgColorHex = rgbToHex(bgColor);
        if (bgColorHex) {
            document.getElementById('bgColor').value = bgColorHex;
        }
    }
    
    // 폰트 크기 확인
    const fontSize = parseInt(computedStyle.fontSize);
    if (fontSize) {
        document.getElementById('fontSize').value = fontSize;
    }
    
    // 폰트 패밀리 확인
    const fontFamily = computedStyle.fontFamily;
    const fontSelect = document.getElementById('fontFamily');
    const options = Array.from(fontSelect.options);
    
    // 현재 폰트와 일치하는 옵션 찾기
    for (let option of options) {
        const optionFont = option.value.toLowerCase().replace(/['"]/g, '');
        const currentFont = fontFamily.toLowerCase().replace(/['"]/g, '');
        
        if (currentFont.includes(optionFont.split(',')[0].trim())) {
            fontSelect.value = option.value;
            break;
        }
    }
}

// RGB를 HEX로 변환하는 함수
function rgbToHex(rgb) {
    // 이미 hex 형식이면 그대로 반환
    if (rgb.startsWith('#')) {
        return rgb;
    }
    
    // rgb(r, g, b) 형식 파싱
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) {
        return null;
    }
    
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// 포맷 적용 (굵게, 밑줄)
function applyFormat(command) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    document.execCommand(command, false, null);
    
    // 툴바 상태 업데이트
    updateToolbarState();
    
    // 선택 유지
    setTimeout(() => {
        if (currentSelection) {
            currentSelection = window.getSelection();
        }
    }, 10);
}

// 스타일 적용 (색상, 크기, 폰트)
function applyStyle(property, value) {
    let selection = window.getSelection();
    let range;
    
    // 현재 선택이 없으면 저장된 Range 사용
    if (selection.rangeCount === 0 && savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
        range = savedRange;
    } else if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
    } else {
        console.log('선택된 텍스트가 없습니다.');
        showToast('⚠️ 텍스트를 먼저 선택해주세요');
        return;
    }
    
    // 색상 변경 시도 시, fixed-color 클래스가 있는지 확인
    if (property === 'color') {
        const container = range.commonAncestorContainer;
        let element = container.nodeType === 3 ? container.parentElement : container;
        
        // 선택 영역의 부모 요소들을 확인
        while (element) {
            if (element.classList && element.classList.contains('fixed-color')) {
                alert('이 텍스트의 색상은 고정되어 있어 변경할 수 없습니다.');
                return;
            }
            if (element.classList && element.classList.contains('editable-content')) {
                break;
            }
            element = element.parentElement;
        }
        
        // 선택 영역 내부의 fixed-color 요소 확인
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(range.cloneContents());
        if (tempDiv.querySelector('.fixed-color')) {
            alert('선택 영역에 색상이 고정된 텍스트가 포함되어 있습니다.');
            return;
        }
    }
    
    // 선택된 텍스트를 span으로 감싸기
    const span = document.createElement('span');
    
    try {
        range.surroundContents(span);
        span.style[property] = value;
    } catch (e) {
        // 여러 요소에 걸쳐 선택된 경우
        const fragment = range.extractContents();
        const wrapper = document.createElement('span');
        wrapper.style[property] = value;
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);
    }
    
    // 히스토리 저장
    setTimeout(() => saveHistoryState(), 100);
    
    // 성공 메시지
    showToast('✓ 스타일 적용됨');
}

// 텍스트 색상 제거
function removeTextColor() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // 선택된 영역의 모든 요소에서 color 스타일 제거
    const container = range.commonAncestorContainer;
    let element = container.nodeType === 3 ? container.parentElement : container;
    
    // 현재 요소와 자식 요소들의 color 스타일 제거
    if (element.style) {
        element.style.color = '';
        
        // 스타일이 완전히 비었으면 style 속성 제거
        if (element.style.cssText === '') {
            element.removeAttribute('style');
        }
    }
    
    // 선택 영역 내의 모든 span 요소 처리
    const spans = element.querySelectorAll('span');
    spans.forEach(span => {
        span.style.color = '';
        if (span.style.cssText === '') {
            // span에 다른 스타일이 없으면 내용만 유지하고 span 제거
            const parent = span.parentNode;
            while (span.firstChild) {
                parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
        }
    });
    
    // 히스토리 저장
    setTimeout(() => saveHistoryState(), 100);
}

// 배경색 제거
function removeBackgroundColor() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // 선택된 영역의 모든 요소에서 backgroundColor 스타일 제거
    const container = range.commonAncestorContainer;
    let element = container.nodeType === 3 ? container.parentElement : container;
    
    // 현재 요소와 자식 요소들의 backgroundColor 스타일 제거
    if (element.style) {
        element.style.backgroundColor = '';
        
        // 스타일이 완전히 비었으면 style 속성 제거
        if (element.style.cssText === '') {
            element.removeAttribute('style');
        }
    }
    
    // 선택 영역 내의 모든 span 요소 처리
    const spans = element.querySelectorAll('span');
    spans.forEach(span => {
        span.style.backgroundColor = '';
        if (span.style.cssText === '') {
            // span에 다른 스타일이 없으면 내용만 유지하고 span 제거
            const parent = span.parentNode;
            while (span.firstChild) {
                parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
        }
    });
    
    // 히스토리 저장
    setTimeout(() => saveHistoryState(), 100);
}

// ============ 실행 취소/다시 실행 기능 ============

// 편집 가능 영역의 현재 상태 저장
function saveHistoryState() {
    if (isRestoringHistory) return;
    
    const editableFields = [
        'preview-job-title',
        'preview-recommend',
        'preview-duties',
        'preview-requirements',
        'preview-preferred',
        'preview-requirements-note',
        'preview-work-hours',
        'preview-work-location',
        'preview-salary-info',
        'preview-additional-info'
    ];
    
    const state = {};
    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            state[fieldId] = element.innerHTML;
        }
    });
    
    // 이전 상태와 동일하면 저장하지 않음 (중복 방지)
    if (undoHistory.length > 0) {
        const lastState = undoHistory[undoHistory.length - 1];
        let isDifferent = false;
        
        for (let fieldId in state) {
            if (state[fieldId] !== lastState[fieldId]) {
                isDifferent = true;
                break;
            }
        }
        
        if (!isDifferent) {
            return; // 동일한 상태는 저장하지 않음
        }
    }
    
    // 현재 상태를 히스토리에 추가
    undoHistory.push(state);
    
    // 히스토리 크기 제한
    if (undoHistory.length > maxHistorySize) {
        undoHistory.shift();
    }
    
    // 새로운 작업이 발생하면 다시 실행 히스토리 초기화
    redoHistory = [];
}

// 실행 취소
function undo() {
    if (undoHistory.length === 0) {
        console.log('실행 취소할 내용이 없습니다.');
        showToast('⚠️ 실행 취소할 내용이 없습니다');
        return;
    }
    
    // 현재 상태를 다시 실행 히스토리에 저장
    const currentState = {};
    const editableFields = [
        'preview-job-title',
        'preview-recommend',
        'preview-duties',
        'preview-requirements',
        'preview-preferred',
        'preview-requirements-note',
        'preview-work-hours',
        'preview-work-location',
        'preview-salary-info',
        'preview-additional-info'
    ];
    
    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            currentState[fieldId] = element.innerHTML;
        }
    });
    
    redoHistory.push(currentState);
    
    // 이전 상태 복원
    const previousState = undoHistory.pop();
    isRestoringHistory = true;
    
    Object.keys(previousState).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.innerHTML = previousState[fieldId];
        }
    });
    
    // 입력 필드도 동기화
    syncAllFieldsToInput();
    
    setTimeout(() => {
        isRestoringHistory = false;
    }, 100);
    
    console.log('✅ 실행 취소');
    showToast('↶ 실행 취소');
}

// 다시 실행
function redo() {
    if (redoHistory.length === 0) {
        console.log('다시 실행할 내용이 없습니다.');
        showToast('⚠️ 다시 실행할 내용이 없습니다');
        return;
    }
    
    // 현재 상태를 실행 취소 히스토리에 저장
    const currentState = {};
    const editableFields = [
        'preview-recommend',
        'preview-duties',
        'preview-requirements',
        'preview-preferred',
        'preview-requirements-note',
        'preview-work-hours',
        'preview-work-location',
        'preview-salary-info',
        'preview-additional-info'
    ];
    
    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            currentState[fieldId] = element.innerHTML;
        }
    });
    
    undoHistory.push(currentState);
    
    // 다음 상태 복원
    const nextState = redoHistory.pop();
    isRestoringHistory = true;
    
    Object.keys(nextState).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.innerHTML = nextState[fieldId];
        }
    });
    
    // 입력 필드도 동기화
    syncAllFieldsToInput();
    
    setTimeout(() => {
        isRestoringHistory = false;
    }, 100);
    
    console.log('✅ 다시 실행');
    showToast('↷ 다시 실행');
}

// 모든 필드를 입력 폼으로 동기화
function syncAllFieldsToInput() {
    const fieldMappings = [
        { previewId: 'preview-job-title', inputId: 'job-title' },
        { previewId: 'preview-recommend', inputId: 'recommend' },
        { previewId: 'preview-duties', inputId: 'duties' },
        { previewId: 'preview-requirements', inputId: 'requirements' },
        { previewId: 'preview-preferred', inputId: 'preferred' },
        { previewId: 'preview-requirements-note', inputId: 'requirements-note' },
        { previewId: 'preview-work-hours', inputId: 'work-hours' },
        { previewId: 'preview-work-location', inputId: 'work-location' },
        { previewId: 'preview-salary-info', inputId: 'salary-info' },
        { previewId: 'preview-additional-info', inputId: 'additional-info' }
    ];
    
    fieldMappings.forEach(mapping => {
        syncToInput(mapping.inputId, mapping.previewId);
    });
}

// 전체 선택 (특정 요소 내에서만)
function selectAllInElement(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

// ============ 부서별 이미지 변경 기능 ============

// 부서 선택에 따라 이미지 변경
function updateImagesBasedOnDepartment() {
    const department = document.getElementById('department').value;
    const topImage = document.querySelector('.top-image img');
    const bottomImage = document.querySelector('.bottom-image img');
    
    if (!topImage || !bottomImage) return;
    
    if (department === '개발사업부') {
        // 개발사업부 선택 시 2번 이미지 사용
        topImage.src = 'jop-top2.png';
        bottomImage.src = 'jop-under2.png';
        console.log('✅ 개발사업부 이미지로 변경');
    } else {
        // 다른 부서 또는 미선택 시 기본 이미지 사용
        topImage.src = 'jop-top.png';
        bottomImage.src = 'jop-under.png';
        console.log('✅ 기본 이미지로 변경');
    }
}

// ============ 부서 관리 기능 ============

// 기본 부서 목록
const DEFAULT_DEPARTMENTS = [
    '개발사업부',
    '마케팅사업부',
    '브랜드사업부',
    '콘텐츠사업부',
    '경영지원실',
    '그로스실',
    '기업부설연구실',
    '디자인실',
    '핫셀러 일본',
    '아이돈워너셀'
];

// 부서 목록 불러오기
function loadDepartments() {
    const saved = localStorage.getItem('departments');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('부서 목록 로드 실패:', e);
            return DEFAULT_DEPARTMENTS;
        }
    }
    return DEFAULT_DEPARTMENTS;
}

// 부서 목록 저장
function saveDepartments(departments) {
    localStorage.setItem('departments', JSON.stringify(departments));
}

// 부서 드롭다운 업데이트
function updateDepartmentDropdown() {
    const select = document.getElementById('department');
    if (!select) return;
    
    const currentValue = select.value;
    const departments = loadDepartments();
    
    // 드롭다운 초기화
    select.innerHTML = '<option value="">부서 선택</option>';
    
    // 부서 목록 추가
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
    
    // 이전 선택값 복원 (목록에 있으면)
    if (currentValue && departments.includes(currentValue)) {
        select.value = currentValue;
    }
}

// 부서 관리 모달 열기
function openDepartmentModal() {
    const modal = document.getElementById('departmentModal');
    if (modal) {
        modal.classList.add('show');
        renderDepartmentList();
        
        // 입력란 초기화 및 포커스
        const input = document.getElementById('newDepartmentInput');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 100);
        }
    }
}

// 부서 관리 모달 닫기
function closeDepartmentModal() {
    const modal = document.getElementById('departmentModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 부서 목록 렌더링
function renderDepartmentList() {
    const listContainer = document.getElementById('departmentList');
    if (!listContainer) return;
    
    const departments = loadDepartments();
    
    if (departments.length === 0) {
        listContainer.innerHTML = '<div class="empty-list-message">부서가 없습니다. 새 부서를 추가해주세요.</div>';
        return;
    }
    
    listContainer.innerHTML = '';
    
    departments.forEach((dept, index) => {
        const item = document.createElement('div');
        item.className = 'department-item';
        
        const name = document.createElement('span');
        name.className = 'department-name';
        name.textContent = dept;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = () => deleteDepartment(index);
        
        item.appendChild(name);
        item.appendChild(deleteBtn);
        listContainer.appendChild(item);
    });
}

// 부서 추가
function addDepartment() {
    const input = document.getElementById('newDepartmentInput');
    if (!input) return;
    
    const newDept = input.value.trim();
    
    if (!newDept) {
        alert('⚠️ 부서 이름을 입력해주세요.');
        input.focus();
        return;
    }
    
    const departments = loadDepartments();
    
    // 중복 체크
    if (departments.includes(newDept)) {
        alert('⚠️ 이미 존재하는 부서입니다.');
        input.focus();
        return;
    }
    
    // 부서 추가
    departments.push(newDept);
    saveDepartments(departments);
    
    // UI 업데이트
    renderDepartmentList();
    updateDepartmentDropdown();
    
    // 입력란 초기화
    input.value = '';
    input.focus();
    
    console.log('✅ 부서 추가됨:', newDept);
}

// 부서 삭제
function deleteDepartment(index) {
    const departments = loadDepartments();
    const deptName = departments[index];
    
    if (!confirm(`"${deptName}" 부서를 삭제하시겠습니까?`)) {
        return;
    }
    
    // 부서 삭제
    departments.splice(index, 1);
    saveDepartments(departments);
    
    // UI 업데이트
    renderDepartmentList();
    updateDepartmentDropdown();
    
    console.log('✅ 부서 삭제됨:', deptName);
}

// 부서 목록 초기화
function resetDepartments() {
    if (!confirm('기본 부서 목록으로 복원하시겠습니까?\n\n현재 목록은 삭제되고 기본 10개 부서로 초기화됩니다.')) {
        return;
    }
    
    // 기본 목록으로 복원
    saveDepartments(DEFAULT_DEPARTMENTS);
    
    // UI 업데이트
    renderDepartmentList();
    updateDepartmentDropdown();
    
    alert('✅ 기본 부서 목록으로 복원되었습니다.');
    console.log('✅ 부서 목록 초기화됨');
}

// ============ 공고 히스토리 기능 (Firebase 연동) ============

// Firebase 히스토리 캐시 (로컬)
let historiesCache = [];

// 히스토리 불러오기 (Firebase)
async function loadHistories() {
    try {
        // Firebase에서 데이터 가져오기
        const snapshot = await historiesRef.once('value');
        const data = snapshot.val();
        
        if (data) {
            // 객체를 배열로 변환 (날짜순 정렬)
            historiesCache = Object.values(data).sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );
        } else {
            historiesCache = [];
        }
        
        // 로컬 스토리지에도 백업
        localStorage.setItem('jobHistories', JSON.stringify(historiesCache));
        
        return historiesCache;
    } catch (error) {
        console.error('Firebase 로드 실패, 로컬 스토리지 사용:', error);
        
        // Firebase 실패 시 로컬 스토리지 사용
        const saved = localStorage.getItem('jobHistories');
        if (saved) {
            try {
                historiesCache = JSON.parse(saved);
                return historiesCache;
            } catch (e) {
                return [];
            }
        }
        return [];
    }
}

// 히스토리 저장 (Firebase)
async function saveHistories(histories) {
    try {
        // Firebase에 저장 (배열을 객체로 변환)
        const historiesObj = {};
        histories.forEach(history => {
            historiesObj[history.id] = history;
        });
        
        await historiesRef.set(historiesObj);
        
        // 로컬 캐시 업데이트
        historiesCache = histories;
        
        // 로컬 스토리지 백업
        localStorage.setItem('jobHistories', JSON.stringify(histories));
        
        console.log('✅ Firebase에 히스토리 저장 완료');
    } catch (error) {
        console.error('Firebase 저장 실패:', error);
        
        // 실패 시 로컬 스토리지만 저장
        localStorage.setItem('jobHistories', JSON.stringify(histories));
        alert('⚠️ 온라인 동기화 실패. 로컬에만 저장되었습니다.');
    }
}

// 현재 공고를 히스토리에 저장 (Firebase)
async function saveCurrentHistory() {
    const department = document.getElementById('department').value;
    const jobTitle = document.getElementById('job-title').value.trim();
    
    // 유효성 검사
    if (!department) {
        alert('⚠️ 부서를 먼저 선택해주세요.');
        document.getElementById('department').focus();
        return;
    }
    
    if (!jobTitle) {
        alert('⚠️ 공고 제목을 입력해주세요.');
        document.getElementById('job-title').focus();
        return;
    }
    
    // 현재 입력된 모든 데이터 수집
    const data = {};
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        data[textarea.id] = textarea.value;
    });
    
    // 미리보기 영역의 HTML 스타일도 함께 저장
    const previewHTML = {};
    const editableFields = [
        'preview-job-title',
        'preview-recommend',
        'preview-duties',
        'preview-requirements',
        'preview-preferred',
        'preview-requirements-note',
        'preview-salary-info',
        'preview-additional-info'
    ];
    
    editableFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            previewHTML[fieldId] = element.innerHTML;
        }
    });
    
    // 히스토리 객체 생성
    const history = {
        id: Date.now().toString(), // 고유 ID
        department: department,
        jobTitle: jobTitle,
        date: new Date().toISOString(),
        data: data,
        previewHTML: previewHTML  // 미리보기 HTML 추가
    };
    
    try {
        // Firebase에 직접 저장 (개별 항목으로)
        await historiesRef.child(history.id).set(history);
        
        // 로컬 캐시 업데이트
        historiesCache.unshift(history);
        
        // 개수 제한 (최대 50개)
        if (historiesCache.length > 50) {
            const oldestId = historiesCache[50].id;
            historiesCache.splice(50);
            // Firebase에서도 삭제
            await historiesRef.child(oldestId).remove();
        }
        
        // 로컬 스토리지 백업
        localStorage.setItem('jobHistories', JSON.stringify(historiesCache));
        
        // UI 업데이트
        await renderHistoryList();
        
        // 성공 메시지
        alert('✅ 현재 공고가 클라우드에 저장되었습니다!\n☁️ 모든 컴퓨터에서 자동으로 동기화됩니다.');
        console.log('✅ Firebase에 히스토리 저장 완료:', history);
        
    } catch (error) {
        console.error('Firebase 저장 실패:', error);
        alert('⚠️ 클라우드 저장 실패. 네트워크를 확인해주세요.');
    }
}

// 히스토리 목록 토글
async function toggleHistoryList() {
    const historyList = document.getElementById('historyList');
    const toggleIcon = document.getElementById('toggleHistoryIcon');
    
    if (historyList.style.display === 'none') {
        historyList.style.display = 'block';
        toggleIcon.textContent = '▲';
        
        // Firebase에서 최신 데이터 로드
        historyList.innerHTML = '<div class="history-empty">☁️ 클라우드에서 불러오는 중...</div>';
        await renderHistoryList();
    } else {
        historyList.style.display = 'none';
        toggleIcon.textContent = '▼';
    }
}

// 히스토리 목록 렌더링 (Firebase) - 부서별 드롭다운
async function renderHistoryList() {
    const listContainer = document.getElementById('historyList');
    if (!listContainer) return;
    
    const histories = await loadHistories();
    
    if (histories.length === 0) {
        listContainer.innerHTML = '<div class="history-empty">저장된 히스토리가 없습니다.<br>현재 공고를 저장해보세요! ☁️</div>';
        return;
    }
    
    // 부서별로 그룹화
    const groupedByDept = {};
    histories.forEach(history => {
        const dept = history.department || '부서 미지정';
        if (!groupedByDept[dept]) {
            groupedByDept[dept] = [];
        }
        groupedByDept[dept].push(history);
    });
    
    // HTML 생성 (부서별 드롭다운)
    let html = '';
    Object.keys(groupedByDept).sort().forEach(dept => {
        const deptId = 'dept-' + dept.replace(/[^a-zA-Z0-9]/g, '-');
        const count = groupedByDept[dept].length;
        
        html += `<div class="history-department-group">`;
        html += `
            <div class="history-department-title" onclick="toggleDepartment('${deptId}')">
                <div class="history-department-title-text">
                    <span class="history-department-arrow" id="${deptId}-arrow">▶</span>
                    <span>${escapeHtml(dept)}</span>
                    <span class="history-department-count">${count}개</span>
                </div>
            </div>
        `;
        
        html += `<div class="history-department-items" id="${deptId}">`;
        
        groupedByDept[dept].forEach(history => {
            const date = new Date(history.date);
            const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            html += `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-item-title">${escapeHtml(history.jobTitle)}</div>
                        <div class="history-item-date">☁️ ${dateStr}</div>
                    </div>
                    <div class="history-item-actions">
                        <button class="history-load-btn" onclick="loadHistory('${history.id}')">불러오기</button>
                        <button class="history-delete-btn" onclick="deleteHistory('${history.id}')">삭제</button>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        html += `</div>`;
    });
    
    listContainer.innerHTML = html;
}

// 부서별 히스토리 토글
function toggleDepartment(deptId) {
    const itemsContainer = document.getElementById(deptId);
    const arrow = document.getElementById(deptId + '-arrow');
    
    if (!itemsContainer || !arrow) return;
    
    if (itemsContainer.classList.contains('expanded')) {
        itemsContainer.classList.remove('expanded');
        arrow.textContent = '▶';
        arrow.classList.remove('expanded');
    } else {
        itemsContainer.classList.add('expanded');
        arrow.textContent = '▼';
        arrow.classList.add('expanded');
    }
}

// 히스토리 불러오기
async function loadHistory(historyId) {
    const history = historiesCache.find(h => h.id === historyId);
    
    if (!history) {
        alert('❌ 히스토리를 찾을 수 없습니다.');
        return;
    }
    
    // 확인 메시지
    if (!confirm(`"${history.jobTitle}" 공고를 불러오시겠습니까?\n\n현재 작성 중인 내용은 저장되지 않습니다.`)) {
        return;
    }
    
    // 부서 선택
    const departmentSelect = document.getElementById('department');
    if (departmentSelect) {
        departmentSelect.value = history.department;
        localStorage.setItem('department', history.department);
    }
    
    // 모든 입력 필드 복원
    Object.keys(history.data).forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.value = history.data[fieldId];
            localStorage.setItem(fieldId, history.data[fieldId]);
        }
    });
    
    // 미리보기 업데이트 - 항상 입력 필드 기준으로 재생성
    Object.keys(history.data).forEach(fieldId => {
        updatePreview(fieldId);
    });
    
    // 미리보기 스타일 복원 (포맷팅, 색상 등)
    if (history.previewHTML) {
        setTimeout(() => {
            restorePreviewStyles();
        }, 100);
    }
    
    // 실행 취소 히스토리에 저장
    setTimeout(() => {
        saveHistoryState();
    }, 100);
    
    // 부서에 맞는 이미지 업데이트
    updateImagesBasedOnDepartment();
    
    alert('✅ 히스토리를 불러왔습니다!');
    console.log('✅ 히스토리 불러옴:', history);
}

// 히스토리 삭제 (Firebase)
async function deleteHistory(historyId) {
    const history = historiesCache.find(h => h.id === historyId);
    
    if (!history) {
        alert('❌ 히스토리를 찾을 수 없습니다.');
        return;
    }
    
    if (!confirm(`"${history.jobTitle}" 히스토리를 삭제하시겠습니까?\n\n☁️ 모든 컴퓨터에서 삭제됩니다.`)) {
        return;
    }
    
    try {
        // Firebase에서 삭제
        await historiesRef.child(historyId).remove();
        
        // 로컬 캐시에서도 삭제
        historiesCache = historiesCache.filter(h => h.id !== historyId);
        
        // 로컬 스토리지 업데이트
        localStorage.setItem('jobHistories', JSON.stringify(historiesCache));
        
        // UI 업데이트
        await renderHistoryList();
        
        console.log('✅ Firebase에서 히스토리 삭제됨:', historyId);
    } catch (error) {
        console.error('Firebase 삭제 실패:', error);
        alert('⚠️ 삭제에 실패했습니다. 네트워크를 확인해주세요.');
    }
}

// Firebase 실시간 리스너 설정
function setupFirebaseListener() {
    if (typeof historiesRef === 'undefined') {
        console.warn('Firebase가 초기화되지 않았습니다.');
        return;
    }
    
    // 데이터 변경 감지
    historiesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // 객체를 배열로 변환 (날짜순 정렬)
            historiesCache = Object.values(data).sort((a, b) => 
                new Date(b.date) - new Date(a.date)
            );
        } else {
            historiesCache = [];
        }
        
        // 로컬 스토리지 백업
        localStorage.setItem('jobHistories', JSON.stringify(historiesCache));
        
        // UI가 열려있으면 자동 업데이트
        const historyList = document.getElementById('historyList');
        if (historyList && historyList.style.display !== 'none') {
            renderHistoryList();
        }
        
        console.log('☁️ Firebase 데이터 동기화:', historiesCache.length, '개');
    });
}

// 페이지 로드 시 Firebase 리스너 시작
window.addEventListener('load', () => {
    setTimeout(() => {
        setupFirebaseListener();
        console.log('✅ Firebase 실시간 동기화 시작');
    }, 1000);
});


// ============ Gemini AI 자동 생성 기능 ============

// Gemini API 호출 함수
async function callGeminiAPI(prompt, type) {
    try {
        console.log('🤖 Gemini API 호출 시작:', type);
        
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prompt: prompt,
                type: type 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API 호출 실패');
        }

        const data = await response.json();
        
        if (data.success && data.text) {
            console.log('✅ Gemini API 성공');
            return data.text;
        } else {
            throw new Error('응답 형식이 올바르지 않습니다.');
        }
        
    } catch (error) {
        console.error('❌ Gemini API 오류:', error);
        throw error;
    }
}

// 프롬프트 생성 함수
function generatePrompt(type) {
    const department = document.getElementById('department').value || '회사';
    const jobTitle = document.getElementById('job-title').value || '직원';
    
    const prompts = {
        'recommend': `${department}에서 ${jobTitle} 채용공고를 작성 중입니다.
"이런분들에게 추천합니다" 섹션에 들어갈 내용을 5-7개 항목으로 작성해주세요.
각 항목은 한 줄로, 간결하고 구체적으로 작성해주세요.
예시처럼 "~하신 분", "~에 관심이 많으신 분" 형식으로 작성해주세요.`,

        'duties': `${department}에서 ${jobTitle} 채용공고를 작성 중입니다.
"담당 업무" 섹션에 들어갈 내용을 5-7개 항목으로 작성해주세요.
각 항목은 한 줄로, 구체적이고 실무적으로 작성해주세요.`,

        'requirements': `${department}에서 ${jobTitle} 채용공고를 작성 중입니다.
"필수 자격" 섹션에 들어갈 내용을 5-7개 항목으로 작성해주세요.
각 항목은 한 줄로, 필수적인 자격요건만 간결하게 작성해주세요.`,

        'preferred': `${department}에서 ${jobTitle} 채용공고를 작성 중입니다.
"우대 사항" 섹션에 들어갈 내용을 5-7개 항목으로 작성해주세요.
각 항목은 한 줄로, 우대할 만한 경험이나 역량을 간결하게 작성해주세요.`
    };
    
    return prompts[type] || prompts['duties'];
}

// AI로 내용 생성 (특정 필드)
async function generateWithAI(fieldId) {
    const textarea = document.getElementById(fieldId);
    if (!textarea) {
        console.error('Textarea not found:', fieldId);
        return;
    }
    
    // 버튼 비활성화 및 로딩 표시
    const button = document.querySelector(`button[onclick="generateWithAI('${fieldId}')"]`);
    if (button) {
        button.disabled = true;
        button.textContent = '⏳ AI 생성 중...';
    }
    
    try {
        // 프롬프트 생성
        const prompt = generatePrompt(fieldId);
        
        // Gemini API 호출
        const result = await callGeminiAPI(prompt, fieldId);
        
        // 결과를 textarea에 입력
        textarea.value = result.trim();
        
        // 미리보기 업데이트
        updatePreview(fieldId);
        
        // 로컬 스토리지 저장
        localStorage.setItem(fieldId, textarea.value);
        
        // 성공 메시지
        if (button) {
            button.textContent = '✅ 완료!';
            setTimeout(() => {
                button.textContent = '✨ AI로 작성';
                button.disabled = false;
            }, 2000);
        }
        
        console.log('✅ AI 생성 완료:', fieldId);
        
    } catch (error) {
        console.error('AI 생성 실패:', error);
        alert('❌ AI 생성에 실패했습니다.\n\n' + error.message + '\n\nVercel 환경 변수에 GEMINI_API_KEY가 설정되어 있는지 확인해주세요.');
        
        // 버튼 복원
        if (button) {
            button.textContent = '✨ AI로 작성';
            button.disabled = false;
        }
    }
}

// 모든 섹션을 AI로 한 번에 생성
async function generateAllWithAI() {
    const fields = ['recommend', 'duties', 'requirements', 'preferred'];
    
    if (!confirm('🤖 AI로 모든 섹션을 자동 생성하시겠습니까?\n\n현재 작성된 내용이 모두 대체됩니다.')) {
        return;
    }
    
    const button = document.querySelector('.generate-all-btn');
    if (button) {
        button.disabled = true;
        button.textContent = '⏳ 전체 생성 중...';
    }
    
    let successCount = 0;
    
    for (const fieldId of fields) {
        try {
            console.log(`🤖 ${fieldId} 생성 중...`);
            await generateWithAI(fieldId);
            successCount++;
            
            // 각 요청 사이에 1초 대기 (API 제한 방지)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`${fieldId} 생성 실패:`, error);
        }
    }
    
    if (button) {
        button.textContent = '🚀 전체 생성';
        button.disabled = false;
    }
    
    alert(`✅ AI 생성 완료!\n\n${successCount}/${fields.length}개 섹션이 생성되었습니다.`);
}

// 토스트 알림 표시
function showToast(message, duration = 2000) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

