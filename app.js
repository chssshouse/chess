// app.js - 10x10 변형 체스 게임 (수정버전)

let boardState = [];
let currentMode = 'standard';
let currentTurn = 'w';
let selectedSquare = null;
let variantState = {
    giraffeStates: {},
    thiefStates: {},
    scholarCaptures: {},
    clownCaptures: {},
    whitePawnCount: 10,
    blackPawnCount: 10,
    canQueenCaptureClown: true,
    transformedPieces: new Set() // 변형된 기물 추적
};

let blackTime = 600;
let whiteTime = 600;
let gameTimerInterval = null;
let gameDuration = 600;
let pendingPromotion = null;
let gameActive = false;

/* =========================================================
   보드 초기화
   ========================================================= */
function createEmptyBoard() {
    return Array(10).fill().map(() => Array(10).fill(null));
}

function setupStartingPosition() {
    boardState = createEmptyBoard();

    // 10x10 시작 위치 설정
    const backRankWhite = ['wr','wn','wo','wb','wq','wk','wb','wo','wn','wr'];
    const backRankBlack = ['br','bn','bo','bb','bq','bk','bb','bo','bn','br'];

    for (let c = 0; c < 10; c++) {
        boardState[0][c] = backRankBlack[c];
        boardState[1][c] = 'bp';
        boardState[8][c] = 'wp';
        boardState[9][c] = backRankWhite[c];
    }

    variantState = {
        giraffeStates: {},
        thiefStates: {},
        scholarCaptures: {},
        clownCaptures: {},
        whitePawnCount: 10,
        blackPawnCount: 10,
        canQueenCaptureClown: true,
        transformedPieces: new Set()
    };
}

/* =========================================================
   UI 초기화 및 이벤트 처리
   ========================================================= */
function initUI() {
    // 모드 선택
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            currentMode = e.currentTarget.dataset.mode || 'standard';
            
            // 변형 모드 정보 표시
            const variantInfo = document.getElementById('variant-info');
            if (currentMode === 'variant') {
                variantInfo.classList.remove('hidden');
            } else {
                variantInfo.classList.add('hidden');
            }
        });
    });

    // 시간 선택
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            gameDuration = parseInt(e.currentTarget.dataset.time, 10) || 600;
        });
    });

    // 게임 시작 버튼
    document.getElementById('start-game-btn').addEventListener('click', startGame);

    // 메뉴로 돌아가기
    document.getElementById('back-to-menu').addEventListener('click', backToMenu);
    document.getElementById('menu-btn').addEventListener('click', backToMenu);

    // 게임 컨트롤
    document.getElementById('surrender-btn').addEventListener('click', surrender);
    document.getElementById('restart-game-btn').addEventListener('click', restartGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    // 승진 선택
    document.querySelectorAll('.piece-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            handlePromotionChoice(e.currentTarget.dataset.pieceType);
        });
    });
}

function backToMenu() {
    gameActive = false;
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
    
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('game-over-modal').classList.add('hidden');
}

function surrender() {
    if (confirm('정말로 기권하시겠습니까?')) {
        endGame(currentTurn === 'w' ? 'b' : 'w', '기권');
    }
}

function restartGame() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
    
    startGame();
}

/* =========================================================
   게임 시작
   ========================================================= */
function startGame() {
    gameActive = true;
    setupStartingPosition();
    currentTurn = 'w';
    selectedSquare = null;
    pendingPromotion = null;
    clearHighlights();

    // UI 전환
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('promotion-modal').classList.add('hidden');
    document.getElementById('game-over-modal').classList.add('hidden');

    // 게임 정보 업데이트
    document.getElementById('current-mode-display').textContent = 
        currentMode === 'variant' ? '변형 체스' : '일반 체스';
    document.getElementById('current-time-display').textContent = 
        `${Math.floor(gameDuration / 60)}분`;

    renderBoard();

    // 타이머 설정
    blackTime = gameDuration;
    whiteTime = gameDuration;
    updateTimerDisplays();

    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(updateGameTimer, 1000);
}

function updateGameTimer() {
    if (!gameActive || pendingPromotion) return;
    
    if (currentTurn === 'w') {
        whiteTime--;
        if (whiteTime <= 0) endGame('b', '시간 초과');
    } else {
        blackTime--;
        if (blackTime <= 0) endGame('w', '시간 초과');
    }
    updateTimerDisplays();
}

function updateTimerDisplays() {
    document.querySelector('.black-timer').textContent = formatTime(blackTime);
    document.querySelector('.white-timer').textContent = formatTime(whiteTime);
}

function formatTime(sec) {
    const mm = Math.floor(sec / 60);
    const ss = sec % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/* =========================================================
   렌더링
   ========================================================= */
function renderBoard() {
    const boardEl = document.getElementById('chessboard');
    boardEl.innerHTML = '';
    
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const sq = document.createElement('div');
            sq.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            sq.dataset.row = r;
            sq.dataset.col = c;

            const piece = boardState[r][c];
            if (piece) {
                const p = document.createElement('div');
                p.className = `piece ${piece}`;
                sq.appendChild(p);
            }

            sq.addEventListener('click', () => onSquareClick(r, c));
            boardEl.appendChild(sq);
        }
    }
    updateCheckStatusDisplay();
}

function updateCheckStatusDisplay() {
    const el = document.getElementById('check-status-display');
    if (isKingInCheck(currentTurn)) {
        el.textContent = `${currentTurn === 'w' ? '백' : '흑'} 체크`;
        el.style.color = '#f05050';
    } else {
        el.textContent = '게임 진행 중';
        el.style.color = '#4cc9f0';
    }
}

/* =========================================================
   클릭 처리
   ========================================================= */
function onSquareClick(r, c) {
    if (!gameActive || pendingPromotion) return;

    const piece = boardState[r][c];

    if (selectedSquare) {
        const [sr, sc] = selectedSquare;
        if (sr === r && sc === c) {
            clearSelection();
            return;
        }

        const moves = getAllValidMoves(sr, sc);
        const move = moves.find(m => m.r === r && m.c === c);
        
        if (move) {
            executeMove(sr, sc, r, c, move);
            clearSelection();
            
            if (!pendingPromotion) {
                switchTurn();
                renderBoard();
                checkVariantConditions();
            }
            return;
        }
    }

    if (piece && piece[0] === currentTurn) {
        selectedSquare = [r, c];
        highlightMoves(r, c);
    } else {
        clearSelection();
    }
}

function clearSelection() {
    selectedSquare = null;
    clearHighlights();
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('highlight', 'capture-highlight');
    });
}

function highlightMoves(r, c) {
    clearHighlights();
    const moves = getAllValidMoves(r, c);
    
    moves.forEach(move => {
        const sq = document.querySelector(`[data-row="${move.r}"][data-col="${move.c}"]`);
        if (sq) {
            const hasEnemy = boardState[move.r][move.c] && boardState[move.r][move.c][0] !== currentTurn;
            sq.classList.add(hasEnemy ? 'capture-highlight' : 'highlight');
        }
    });
}

/* =========================================================
   이동 로직
   ========================================================= */
function inBounds(r, c) {
    return r >= 0 && r < 10 && c >= 0 && c < 10;
}

function getSlidingMoves(r, c, color, directions, board = boardState) {
    const moves = [];
    directions.forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
                moves.push({r: nr, c: nc});
            } else {
                if (target[0] !== color) moves.push({r: nr, c: nc, capture: true});
                break;
            }
            nr += dr; nc += dc;
        }
    });
    return moves;
}

function getKnightMoves(r, c, color, board = boardState) {
    const moves = [];
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    
    deltas.forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target || target[0] !== color) {
                moves.push({r: nr, c: nc, capture: !!target});
            }
        }
    });
    return moves;
}

function getKingMoves(r, c, color, board = boardState) {
    const moves = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc)) {
                const target = board[nr][nc];
                if (!target || target[0] !== color) {
                    moves.push({r: nr, c: nc, capture: !!target});
                }
            }
        }
    }
    return moves;
}

function getPawnMoves(r, c, color, board = boardState) {
    const moves = [];
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 8 : 1;
    
    // 앞으로 이동
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push({r: r + dir, c: c});
        if (r === startRow && !board[r + 2 * dir][c]) {
            moves.push({r: r + 2 * dir, c: c});
        }
    }
    
    // 대각선 캡처
    [-1, 1].forEach(dc => {
        const nr = r + dir, nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc][0] !== color) {
            moves.push({r: nr, c: nc, capture: true});
        }
    });
    
    return moves;
}

function getElephantMoves(r, c, color, board = boardState) {
    const moves = [];
    const dir = color === 'w' ? -1 : 1;
    
    // 앞으로 1칸
    if (inBounds(r + dir, c) && (!board[r + dir][c] || board[r + dir][c][0] !== color)) {
        moves.push({r: r + dir, c: c});
    }
    
    // 앞으로 1칸 이동 후 양옆으로 1~2칸 이동
    for (let sideStep = 1; sideStep <= 2; sideStep++) {
        // 왼쪽으로 이동
        if (inBounds(r + dir, c - sideStep) && 
            (!board[r + dir][c - sideStep] || board[r + dir][c - sideStep][0] !== color)) {
            moves.push({r: r + dir, c: c - sideStep});
        }
        
        // 오른쪽으로 이동
        if (inBounds(r + dir, c + sideStep) && 
            (!board[r + dir][c + sideStep] || board[r + dir][c + sideStep][0] !== color)) {
            moves.push({r: r + dir, c: c + sideStep});
        }
    }
    
    return moves;
}

function getPseudoLegalMoves(r, c, pieceCode, board = boardState) {
    if (!pieceCode) return [];
    const color = pieceCode[0], type = pieceCode[1];
    
    // 변형 모드 기물
    if (currentMode === 'variant' && window.getVariantPieceMoves) {
        const variantMoves = window.getVariantPieceMoves(r, c, pieceCode, board);
        if (variantMoves.length > 0) return variantMoves;
    }
    
    // 기본 기물
    switch(type) {
        case 'p': return getPawnMoves(r, c, color, board);
        case 'r': return getSlidingMoves(r, c, color, [[-1,0],[1,0],[0,-1],[0,1]], board);
        case 'b': return getSlidingMoves(r, c, color, [[-1,-1],[-1,1],[1,-1],[1,1]], board);
        case 'n': return getKnightMoves(r, c, color, board);
        case 'q': return getSlidingMoves(r, c, color, 
            [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]], board);
        case 'k': return getKingMoves(r, c, color, board);
        case 'o': return getElephantMoves(r, c, color, board);
        default: return [];
    }
}

function getAllValidMoves(r, c) {
    const piece = boardState[r][c];
    if (!piece) return [];
    
    const pseudoMoves = getPseudoLegalMoves(r, c, piece);
    return pseudoMoves.filter(move => {
        const tempBoard = simulateMove(r, c, move.r, move.c);
        return !isKingInCheck(piece[0], tempBoard);
    });
}

function simulateMove(fromR, fromC, toR, toC) {
    const newBoard = boardState.map(row => [...row]);
    newBoard[toR][toC] = newBoard[fromR][fromC];
    newBoard[fromR][fromC] = null;
    return newBoard;
}

/* =========================================================
   체크 및 체크메이트 검사
   ========================================================= */
function findKing(color, board = boardState) {
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const piece = board[r][c];
            if (piece && piece[0] === color && piece[1] === 'k') {
                return [r, c];
            }
        }
    }
    return null;
}

function isKingInCheck(color, board = boardState) {
    const kingPos = findKing(color, board);
    if (!kingPos) return false;
    
    const [kr, kc] = kingPos;
    const enemy = color === 'w' ? 'b' : 'w';
    
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const piece = board[r][c];
            if (piece && piece[0] === enemy) {
                const moves = getPseudoLegalMoves(r, c, piece, board);
                if (moves.some(move => move.r === kr && move.c === kc)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isCheckmate(color) {
    // 킹이 체크 상태가 아니면 체크메이트가 아님
    if (!isKingInCheck(color)) return false;
    
    // 모든 기물의 모든 가능한 이동을 확인
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const piece = boardState[r][c];
            if (piece && piece[0] === color) {
                const moves = getAllValidMoves(r, c);
                if (moves.length > 0) {
                    // 체크를 피할 수 있는 이동이 있으면 체크메이트가 아님
                    return false;
                }
            }
        }
    }
    
    // 체크 상태이고 체크를 피할 수 있는 이동이 없으면 체크메이트
    return true;
}

/* =========================================================
   이동 실행
   ========================================================= */
function executeMove(fromR, fromC, toR, toC, move) {
    const movingPiece = boardState[fromR][fromC];
    const capturedPiece = boardState[toR][toC];
    
    // 광대가 잡힌 경우: 잡은 기물도 같이 죽음 (킹 제외)
    if (capturedPiece && capturedPiece[1] === 'o2' && movingPiece[1] !== 'k') {
        // 광대와 잡은 기물 모두 제거
        boardState[fromR][fromC] = null;
        boardState[toR][toC] = null;
        
        switchTurn();
        renderBoard();
        checkVariantConditions();
        
        // 체크메이트 검사
        if (isCheckmate(currentTurn === 'w' ? 'b' : 'w')) {
            endGame(currentTurn, '체크메이트');
        }
        return;
    }
    
    // 폰 개수 업데이트
    if (capturedPiece && capturedPiece[1] === 'p') {
        if (capturedPiece[0] === 'w') variantState.whitePawnCount--;
        else variantState.blackPawnCount--;
    }
    
    boardState[toR][toC] = movingPiece;
    boardState[fromR][fromC] = null;
    
    // 폰 승진
    if (movingPiece[1] === 'p' && (toR === 0 || toR === 9)) {
        pendingPromotion = [toR, toC];
        document.getElementById('promotion-modal').classList.remove('hidden');
        return;
    }
    
    // 변형 모드 특수 규칙
    if (currentMode === 'variant') {
        handleVariantTransform(fromR, fromC, toR, toC, movingPiece, capturedPiece);
    }
    
    // 체크메이트 검사
    if (isCheckmate(currentTurn === 'w' ? 'b' : 'w')) {
        endGame(currentTurn, '체크메이트');
        return;
    }
}

function handlePromotionChoice(pieceType) {
    if (pendingPromotion) {
        const [r, c] = pendingPromotion;
        boardState[r][c] = currentTurn + pieceType;
        
        if (currentTurn === 'w') variantState.whitePawnCount--;
        else variantState.blackPawnCount--;
        
        pendingPromotion = null;
        document.getElementById('promotion-modal').classList.add('hidden');
        switchTurn();
        renderBoard();
        checkVariantConditions();
        
        // 체크메이트 검사
        if (isCheckmate(currentTurn === 'w' ? 'b' : 'w')) {
            endGame(currentTurn, '체크메이트');
        }
    }
}

// 도둑이 기물을 잡을 때 능력 업데이트 함수
function updateThiefAbility(r, c, capturedType) {
    const thiefKey = `${r},${c}`;
    variantState.thiefStates[thiefKey] = capturedType;
}

// 학자/광대가 기물을 잡을 때 능력 업데이트 함수
function updateScholarClownAbility(r, c, capturedType, isScholar = true) {
    const key = `${r},${c}`;
    const captureState = isScholar ? variantState.scholarCaptures : variantState.clownCaptures;
    
    if (!captureState[key]) {
        captureState[key] = [];
    }
    
    // 같은 타입의 기물을 이미 잡았는지 확인
    if (!captureState[key].includes(capturedType)) {
        captureState[key].push(capturedType);
    }
}

function handleVariantTransform(fromR, fromC, toR, toC, movingPiece, capturedPiece) {
    if (!capturedPiece) return;
    
    const color = movingPiece[0];
    const movingType = movingPiece[1];
    const capturedType = capturedPiece[1];
    const pieceKey = `${toR},${toC}`;
    
    // 이미 변형된 기물은 다시 변형하지 않음
    if (variantState.transformedPieces.has(pieceKey)) return;
    
    // 변형 기물 변환 조건
    if (movingType === 'n' && capturedType === 'q') {
        boardState[toR][toC] = color + 'a'; // 아마존
        variantState.transformedPieces.add(pieceKey);
    } else if (movingType === 'r' && capturedType === 'r') {
        boardState[toR][toC] = color + 'c'; // 캐논
        variantState.transformedPieces.add(pieceKey);
    } else if (movingType === 'b' && capturedType === 'b') {
        boardState[toR][toC] = color + 'd'; // 도둑
        variantState.thiefStates[pieceKey] = null; // 초기에는 능력 없음
        variantState.transformedPieces.add(pieceKey);
    } else if (movingType === 'n' && capturedType === 'n') {
        boardState[toR][toC] = color + 'g'; // 지라프 (특수 능력 삭제)
        variantState.transformedPieces.add(pieceKey);
    }
    
    // 도둑이 기물을 잡으면 그 기물의 능력을 획득
    if (movingType === 'd' && capturedPiece) {
        updateThiefAbility(toR, toC, capturedType);
    }
    
    // 학자나 광대가 기물을 잡으면 그 기물의 능력을 추가
    if ((movingType === 's' || movingType === 'o2') && capturedPiece) {
        updateScholarClownAbility(toR, toC, capturedType, movingType === 's');
    }
}

function switchTurn() {
    currentTurn = currentTurn === 'w' ? 'b' : 'w';
}

/* =========================================================
   변형 조건 체크
   ========================================================= */
function checkVariantConditions() {
    // 학자 변환 (백) - 폰이 1개 남았을 때
    if (currentMode === 'variant' && currentTurn === 'w' && variantState.whitePawnCount === 1) {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
                if (boardState[r][c] === 'wp') {
                    const pieceKey = `${r},${c}`;
                    // 이미 변형되지 않은 폰만 변환
                    if (!variantState.transformedPieces.has(pieceKey)) {
                        boardState[r][c] = 'ws';
                        variantState.scholarCaptures[pieceKey] = [];
                        variantState.transformedPieces.add(pieceKey);
                        variantState.whitePawnCount = 0; // 더 이상 변환되지 않도록
                    }
                    break;
                }
            }
        }
    }
    
    // 광대 변환 (흑) - 폰이 1개 남았을 때
    if (currentMode === 'variant' && currentTurn === 'b' && variantState.blackPawnCount === 1) {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
                if (boardState[r][c] === 'bp') {
                    const pieceKey = `${r},${c}`;
                    // 이미 변형되지 않은 폰만 변환
                    if (!variantState.transformedPieces.has(pieceKey)) {
                        boardState[r][c] = 'bo2';
                        variantState.clownCaptures[pieceKey] = [];
                        variantState.canQueenCaptureClown = false;
                        variantState.transformedPieces.add(pieceKey);
                        variantState.blackPawnCount = 0; // 더 이상 변환되지 않도록
                    }
                    break;
                }
            }
        }
    }
}

/* =========================================================
   게임 종료
   ========================================================= */
function endGame(winnerColor, reason) {
    gameActive = false;
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
    
    const modal = document.getElementById('game-over-modal');
    const text = document.getElementById('game-result-text');
    text.textContent = `${winnerColor === 'w' ? '백' : '흑'} 승리! (${reason})`;
    modal.classList.remove('hidden');
}

/* =========================================================
   초기화
   ========================================================= */
window.addEventListener('load', () => {
    initUI();
    setupStartingPosition();
    renderBoard();
});