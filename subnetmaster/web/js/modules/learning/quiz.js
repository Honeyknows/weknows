/**
 * ============================================================
 * SubnetMaster – Subnetting Quiz Module
 * ============================================================
 * Generates dynamic subnetting questions to test user knowledge.
 * Features score tracking, timer, and answer validation.
 * ============================================================
 */

import { calculateSubnet, intToIp, ipToInt, cidrToMask, isValidIp } from '../../../../core/ip-utils.js';
import { saveQuizScore } from '../../utils/storage-utils.js';

let currentQuestion = 0;
let score = 0;
let timerInterval = null;
let secondsElapsed = 0;
let currentQuizType = 'mixed';
let questions = [];

export function render(container) {
    container.innerHTML = `
        <div id="quiz-setup">
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <h3>Subnetting Quiz</h3>
                </div>
                <div class="card-body" style="text-align: center; padding: 40px 20px;">
                    <h2 style="font-size: 24px; margin-bottom: 16px; color: var(--text-primary);">Test Your Knowledge</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto;">
                        Take a 10-question dynamic quiz to test your subnetting skills. Questions cover network addresses, broadcast addresses, and usable hosts.
                    </p>
                    
                    <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 32px;">
                        <button class="btn btn-secondary start-quiz" data-type="easy">Easy (Class C)</button>
                        <button class="btn btn-primary start-quiz" data-type="mixed">Mixed (All Classes)</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="quiz-active" style="display: none;">
            <div class="card animate-in">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge badge-accent" id="quiz-progress-text">Question 1/10</span>
                        <span class="badge badge-info" id="quiz-score-text">Score: 0</span>
                    </div>
                    <div class="quiz-timer" id="quiz-timer">00:00</div>
                </div>
                <div class="quiz-progress">
                    <div class="quiz-progress-bar" id="quiz-progress-bar" style="width: 10%;"></div>
                </div>
                <div class="card-body">
                    <h2 id="quiz-question" style="font-size: 20px; font-weight: 600; margin-bottom: 24px; line-height: 1.4; color: var(--text-primary);"></h2>
                    
                    <div id="quiz-options" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                        <!-- Options injected here -->
                    </div>

                    <div style="display: flex; justify-content: flex-end;">
                        <button class="btn btn-primary" id="quiz-next" style="display: none;">Next Question</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="quiz-results" style="display: none;">
            <!-- Results injected here -->
        </div>
    `;
}

export function init() {
    document.querySelectorAll('.start-quiz').forEach(btn => {
        btn.addEventListener('click', (e) => {
            startQuiz(e.target.dataset.type);
        });
    });

    document.getElementById('quiz-next').addEventListener('click', nextQuestion);
}

function generateQuestions(type, count = 10) {
    const qs = [];
    for (let i = 0; i < count; i++) {
        // Generate random IP and CIDR based on difficulty
        let octet1;
        if (type === 'easy') {
            octet1 = Math.floor(Math.random() * (223 - 192 + 1)) + 192; // Class C
        } else {
            octet1 = Math.floor(Math.random() * 223) + 1; // Any valid class A/B/C
        }
        
        const octet2 = Math.floor(Math.random() * 256);
        const octet3 = Math.floor(Math.random() * 256);
        const octet4 = Math.floor(Math.random() * 256);
        const ip = `${octet1}.${octet2}.${octet3}.${octet4}`;
        
        let minCidr = type === 'easy' ? 24 : 8;
        const cidr = Math.floor(Math.random() * (30 - minCidr + 1)) + minCidr;
        
        const subnetInfo = calculateSubnet(ip, cidr);
        
        // Pick a question type
        const qTypes = ['network', 'broadcast', 'firstHost', 'lastHost', 'totalHosts'];
        const qType = qTypes[Math.floor(Math.random() * qTypes.length)];
        
        let questionText = '';
        let correctAns = '';
        let options = [];
        
        switch (qType) {
            case 'network':
                questionText = `What is the Network Address for the host ${ip}/${cidr}?`;
                correctAns = subnetInfo.networkAddress;
                options = generateIpOptions(correctAns, subnetInfo.networkInt, cidr);
                break;
            case 'broadcast':
                questionText = `What is the Broadcast Address for the host ${ip}/${cidr}?`;
                correctAns = subnetInfo.broadcastAddress;
                options = generateIpOptions(correctAns, subnetInfo.broadcastInt, cidr);
                break;
            case 'firstHost':
                questionText = `What is the First Usable Host for the subnet containing ${ip}/${cidr}?`;
                correctAns = subnetInfo.firstHost;
                options = generateIpOptions(correctAns, ipToInt(subnetInfo.firstHost), cidr);
                break;
            case 'lastHost':
                questionText = `What is the Last Usable Host for the subnet containing ${ip}/${cidr}?`;
                correctAns = subnetInfo.lastHost;
                options = generateIpOptions(correctAns, ipToInt(subnetInfo.lastHost), cidr);
                break;
            case 'totalHosts':
                questionText = `How many Usable Hosts are in a /${cidr} subnet?`;
                correctAns = subnetInfo.usableHosts.toString();
                options = generateNumOptions(subnetInfo.usableHosts);
                break;
        }
        
        qs.push({
            question: questionText,
            correct: correctAns,
            options: shuffleArray(options)
        });
    }
    return qs;
}

function generateIpOptions(correctIp, baseInt, cidr) {
    const opts = new Set([correctIp]);
    const step = Math.pow(2, 32 - cidr);
    
    while (opts.size < 4) {
        // Generate plausible distractor IPs by shifting by subnet sizes or tweaking last octet
        let distractorInt;
        if (Math.random() > 0.5) {
            distractorInt = (baseInt + (Math.floor(Math.random() * 5) - 2) * step) >>> 0;
        } else {
            distractorInt = (baseInt + Math.floor(Math.random() * 10) - 5) >>> 0;
        }
        
        const distractor = intToIp(distractorInt);
        if (distractor !== correctIp && isValidIp(distractor)) {
            opts.add(distractor);
        }
    }
    return Array.from(opts);
}

function generateNumOptions(correctNum) {
    const opts = new Set([correctNum.toString()]);
    while (opts.size < 4) {
        // Generate nearby powers of 2 minus 2, or just random nearby numbers
        const p = Math.floor(Math.log2(correctNum + 2));
        const distractor = Math.pow(2, p + Math.floor(Math.random() * 3) - 1) - 2;
        if (distractor > 0 && distractor !== correctNum) {
            opts.add(distractor.toString());
        } else {
            opts.add((correctNum + Math.floor(Math.random() * 10) - 5).toString());
        }
    }
    return Array.from(opts);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startQuiz(type) {
    currentQuizType = type;
    questions = generateQuestions(type, 10);
    currentQuestion = 0;
    score = 0;
    secondsElapsed = 0;
    
    document.getElementById('quiz-setup').style.display = 'none';
    document.getElementById('quiz-results').style.display = 'none';
    document.getElementById('quiz-active').style.display = 'block';
    
    startTimer();
    renderQuestion();
}

function startTimer() {
    clearInterval(timerInterval);
    const timerEl = document.getElementById('quiz-timer');
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const s = (secondsElapsed % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
    }, 1000);
}

function renderQuestion() {
    const q = questions[currentQuestion];
    
    document.getElementById('quiz-progress-text').textContent = `Question ${currentQuestion + 1}/10`;
    document.getElementById('quiz-score-text').textContent = `Score: ${score}`;
    document.getElementById('quiz-progress-bar').style.width = `${((currentQuestion + 1) / 10) * 100}%`;
    
    document.getElementById('quiz-question').textContent = q.question;
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.textContent = opt;
        btn.addEventListener('click', () => selectAnswer(btn, opt, q.correct));
        optionsContainer.appendChild(btn);
    });
    
    document.getElementById('quiz-next').style.display = 'none';
}

function selectAnswer(btn, selected, correct) {
    // Disable all options
    document.querySelectorAll('.quiz-option').forEach(b => b.classList.add('disabled'));
    
    if (selected === correct) {
        btn.classList.add('correct');
        score++;
    } else {
        btn.classList.add('incorrect');
        // Find and highlight correct answer
        document.querySelectorAll('.quiz-option').forEach(b => {
            if (b.textContent === correct) b.classList.add('correct');
        });
    }
    
    document.getElementById('quiz-score-text').textContent = `Score: ${score}`;
    document.getElementById('quiz-next').style.display = 'block';
}

function nextQuestion() {
    currentQuestion++;
    if (currentQuestion < questions.length) {
        renderQuestion();
    } else {
        endQuiz();
    }
}

function endQuiz() {
    clearInterval(timerInterval);
    
    document.getElementById('quiz-active').style.display = 'none';
    const resultsContainer = document.getElementById('quiz-results');
    resultsContainer.style.display = 'block';
    
    const percentage = Math.round((score / questions.length) * 100);
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const s = (secondsElapsed % 60).toString().padStart(2, '0');
    const timeStr = `${m}:${s}`;
    
    // Save score
    saveQuizScore({
        score: percentage,
        correct: score,
        total: questions.length,
        time: secondsElapsed,
        type: currentQuizType
    });
    
    let feedback = '';
    if (percentage >= 90) feedback = 'Excellent! You are a SubnetMaster.';
    else if (percentage >= 70) feedback = 'Good job! Solid understanding.';
    else feedback = 'Keep practicing. Review the Educational Mode.';

    resultsContainer.innerHTML = `
        <div class="card animate-in">
            <div class="card-body" style="text-align: center; padding: 48px 20px;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: ${percentage >= 70 ? 'var(--success-bg)' : 'var(--warning-bg)'}; color: ${percentage >= 70 ? 'var(--success)' : 'var(--warning)'}; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <h2 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Quiz Completed!</h2>
                <p style="font-size: 16px; color: var(--text-secondary); margin-bottom: 24px;">${feedback}</p>
                
                <div style="display: flex; justify-content: center; gap: 32px; margin-bottom: 32px;">
                    <div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--accent-primary);">${score}/${questions.length}</div>
                        <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Correct</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--accent-primary);">${percentage}%</div>
                        <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Score</div>
                    </div>
                    <div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--accent-primary);">${timeStr}</div>
                        <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Time</div>
                    </div>
                </div>
                
                <button class="btn btn-primary" onclick="document.getElementById('quiz-results').style.display='none'; document.getElementById('quiz-setup').style.display='block';">
                    Try Again
                </button>
            </div>
        </div>
    `;
}
