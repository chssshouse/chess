const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더의 정적 파일(HTML 등) 제공
app.use(express.static('public'));

// 게임 상태 변수
let gameState = 'betting'; // 'betting' or 'dealing'
let timer = 15; // 베팅 시간 15초
let players = {}; // 접속한 유저 정보

const suits = [
    { icon: '♠', color: 'black' },
    { icon: '♥', color: 'red' },
    { icon: '♦', color: 'red' },
    { icon: '♣', color: 'black' }
];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getRandomCard() {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    let score = (value === 'A') ? 1 : (['10', 'J', 'Q', 'K'].includes(value) ? 0 : parseInt(value));
    return { value, suit, score };
}

// 실시간 게임 루프 (1초마다 실행)
setInterval(() => {
    if (gameState === 'betting') {
        timer--;
        io.emit('timerUpdate', timer);

        if (timer <= 0) {
            startGame();
        }
    }
}, 1000);

async function startGame() {
    gameState = 'dealing';
    io.emit('gameStateChange', 'dealing');

    // 카드 뽑기
    let p1 = getRandomCard(), p2 = getRandomCard();
    let b1 = getRandomCard(), b2 = getRandomCard();
    
    let pScore = (p1.score + p2.score) % 10;
    let bScore = (b1.score + b2.score) % 10;

    // 클라이언트에게 순차적으로 카드 공개 애니메이션을 위한 데이터 전송
    io.emit('dealCards', { p1, p2, b1, b2, pScore, bScore });

    // 결과 판정 (클라이언트 애니메이션 시간 대기 후 전송)
    setTimeout(() => {
        let winResult = pScore > bScore ? 'player' : (bScore > pScore ? 'banker' : 'tie');
        
        // 유저별 수익 정산
        for (let id in players) {
            let p = players[id];
            let winnings = 0;
            if (winResult === 'player') winnings = p.bets.player * 2;
            else if (winResult === 'banker') winnings = p.bets.banker * 2;
            else if (winResult === 'tie') winnings = p.bets.tie * 9;
            
            p.balance += winnings;
            // 각 유저에게 개인 결과 전송
            io.to(id).emit('gameResult', { winResult, winnings, balance: p.balance });
            
            // 다음 판을 위해 베팅금 초기화
            p.bets = { player: 0, tie: 0, banker: 0 };
        }

        // 5초 후 다음 베팅 시작
        setTimeout(() => {
            gameState = 'betting';
            timer = 15;
            io.emit('gameStateChange', 'betting');
        }, 5000);

    }, 3000); // 3초 (카드 오픈 연출 시간)
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // 초기 지급금 세팅 (실제 서비스 시 DB 연동 필요)
    players[socket.id] = { balance: 10000, bets: { player: 0, tie: 0, banker: 0 } };
    
    // 현재 상태 전송
    socket.emit('initData', { balance: players[socket.id].balance, gameState, timer });

    // 베팅 처리
    socket.on('placeBet', (type) => {
        if (gameState !== 'betting') return;
        
        let p = players[socket.id];
        if (p.balance >= 1000) {
            p.balance -= 1000;
            p.bets[type] += 1000;
            socket.emit('betConfirmed', { bets: p.bets, balance: p.balance });
        } else {
            socket.emit('errorMsg', "잔액이 부족합니다.");
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});