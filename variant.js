// variant.js - 변형 기물 이동 로직 (수정버전)

function getVariantPieceMoves(r, c, pieceCode, currentBoard = boardState) {
    const moves = [];
    if (!pieceCode) return moves;
    const color = pieceCode[0];
    const type = pieceCode[1];

    if (type === 'a') { // 아마존: 퀸 + 나이트
        moves.push(...getKnightMoves(r, c, color, currentBoard));
        moves.push(...getSlidingMoves(r, c, color, 
            [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]], currentBoard));
    }
    else if (type === 'c') { // 캐논: 킹 + 룩
        moves.push(...getSlidingMoves(r, c, color, [[-1,0],[1,0],[0,-1],[0,1]], currentBoard));
        moves.push(...getKingMoves(r, c, color, currentBoard));
    }
    else if (type === 'd') { // 도둑: 캡처한 기물 능력
        const thiefKey = `${r},${c}`;
        const capturedType = variantState.thiefStates[thiefKey];
        
        if (capturedType) {
            // 캡처한 기물의 능력 사용
            addMovesForType(capturedType, moves, r, c, color, currentBoard);
        } else {
            // 기본적으로 비숍처럼 움직임
            moves.push(...getSlidingMoves(r, c, color, [[-1,-1],[-1,1],[1,-1],[1,1]], currentBoard));
        }
    }
    else if (type === 'g') { // 지라프: 나이트-비숍 교차
        const giraffeKey = `${r},${c}`;
        const state = variantState.giraffeStates[giraffeKey] || { moveCount: 0 };
        
        if (state.moveCount % 2 === 0) {
            moves.push(...getKnightMoves(r, c, color, currentBoard));
        } else {
            moves.push(...getSlidingMoves(r, c, color, [[-1,-1],[-1,1],[1,-1],[1,1]], currentBoard));
        }
    }
    else if (type === 's') { // 학자: 킹 + 캡처 능력
        moves.push(...getKingMoves(r, c, color, currentBoard));
        
        const scholarKey = `${r},${c}`;
        const captures = variantState.scholarCaptures[scholarKey] || [];
        
        captures.forEach(capType => {
            addMovesForType(capType, moves, r, c, color, currentBoard);
        });
    }
    else if (type === 'o2') { // 광대: 킹 + 캡처 능력 (코끼리가 아님!)
        moves.push(...getKingMoves(r, c, color, currentBoard));
        
        const clownKey = `${r},${c}`;
        const captures = variantState.clownCaptures[clownKey] || [];
        
        captures.forEach(capType => {
            addMovesForType(capType, moves, r, c, color, currentBoard);
        });
    }

    return moves;
}

// 기물 타입에 따른 이동 추가 함수 (수정버전)
function addMovesForType(type, moves, r, c, color, currentBoard) {
    switch(type) {
        case 'r': 
            moves.push(...getSlidingMoves(r, c, color, [[-1,0],[1,0],[0,-1],[0,1]], currentBoard)); 
            break;
        case 'b': 
            moves.push(...getSlidingMoves(r, c, color, [[-1,-1],[-1,1],[1,-1],[1,1]], currentBoard)); 
            break;
        case 'n': 
            moves.push(...getKnightMoves(r, c, color, currentBoard)); 
            break;
        case 'q': 
            moves.push(...getSlidingMoves(r, c, color, 
                [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]], currentBoard)); 
            break;
        case 'p': 
            moves.push(...getPawnMoves(r, c, color, currentBoard)); 
            break;
        case 'k': 
            moves.push(...getKingMoves(r, c, color, currentBoard)); 
            break;
        case 'a': // 아마존
            moves.push(...getKnightMoves(r, c, color, currentBoard));
            moves.push(...getSlidingMoves(r, c, color, 
                [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]], currentBoard));
            break;
        case 'c': // 캐논
            moves.push(...getSlidingMoves(r, c, color, [[-1,0],[1,0],[0,-1],[0,1]], currentBoard));
            moves.push(...getKingMoves(r, c, color, currentBoard));
            break;
        case 'g': // 지라프
            // 지라프는 현재 상태에 따라 이동이 달라지므로 킹 이동만 추가
            moves.push(...getKingMoves(r, c, color, currentBoard));
            break;
        case 'd': // 도둑
            // 도둑은 기본적으로 비숍 이동
            moves.push(...getSlidingMoves(r, c, color, [[-1,-1],[-1,1],[1,-1],[1,1]], currentBoard));
            break;
        case 'o': // 코끼리
            moves.push(...getElephantMoves(r, c, color, currentBoard));
            break;
        case 's': // 학자
            moves.push(...getKingMoves(r, c, color, currentBoard));
            break;
        case 'o2': // 광대
            moves.push(...getKingMoves(r, c, color, currentBoard));
            break;
    }
}

// 도둑이 기물을 잡을 때 능력 업데이트 함수 추가
function updateThiefAbility(r, c, capturedType) {
    const thiefKey = `${r},${c}`;
    variantState.thiefStates[thiefKey] = capturedType;
}

// 학자/광대가 기물을 잡을 때 능력 업데이트 함수 추가
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