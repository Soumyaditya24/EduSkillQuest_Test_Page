let questions = [];
let currentQuestion = 0;
let answers = {};
let timerInterval;
let timerDuration = 30 * 60; // 30 minutes
const topicFiles = [
    {file: 'data/BayesTheorem.csv', name: 'Bayes Theorem'},
    {file: 'data/ConditionalProbability.csv', name: 'Conditional Probability'},
    {file: 'data/IndependentProbability.csv', name: 'Independent Probability'},
    {file: 'data/ProbabilityDensityFunction.csv', name: 'Probability Density Function'},
    {file: 'data/RandomVariables.csv', name: 'Random Variables'}
];
let performanceAnalysis = {}; // Track performance by topic

// Function to load and parse multiple CSV files
function loadQuestionsFromCSV() {
    let promises = topicFiles.map((topic, index) => new Promise((resolve, reject) => {
        Papa.parse(topic.file, {
            download: true,
            header: true,
            complete: function(results) {
                console.log(`Loaded ${topic.file}:`, results.data); // Log the loaded data
                results.data.forEach(q => q.topic = topic.name); // Add topic name
                resolve(results.data);
            },
            error: function(error) {
                reject(error);
            }
        });
    }));

    Promise.all(promises).then(dataArrays => {
        dataArrays.forEach(data => {
            shuffleArray(data);
            questions = questions.concat(data.slice(0, 4)); // Select 4 random questions from each topic
        });
        shuffleArray(questions); // Shuffle all questions to mix topics
        console.log('Final questions array:', questions); // Log the final questions array
        initQuestionStatus();
        displayQuestion(currentQuestion);
        startTimer(timerDuration);
    }).catch(error => {
        console.error("Error loading CSV files:", error);
    });
}

// Function to shuffle an array (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function displayQuestion(index) {
    let question = questions[index];
    console.log('Displaying question:', question); // Log the question being displayed
    document.getElementById('question-number').innerText = index + 1;
    document.getElementById('question-text').innerText = question['Question Text'];
    document.getElementById('option-A').innerText = question['Option A'];
    document.getElementById('option-B').innerText = question['Option B'];
    document.getElementById('option-C').innerText = question['Option C'];
    document.getElementById('option-D').innerText = question['Option D'];

    let radios = document.querySelectorAll('input[name="answer"]');
    radios.forEach(radio => radio.checked = false);

    if (answers[index] !== undefined) {
        document.querySelector(`input[name="answer"][value="${answers[index]}"]`).checked = true;
    }
}

function saveAnswer() {
    let selectedOption = document.querySelector('input[name="answer"]:checked');
    if (selectedOption) {
        answers[currentQuestion] = selectedOption.value;
        updateQuestionStatus(currentQuestion, 'attempted');
    }
}

function reviewLater() {
    updateQuestionStatus(currentQuestion, 'to-be-reviewed');
}

function clearSelection() {
    let radios = document.querySelectorAll('input[name="answer"]');
    radios.forEach(radio => radio.checked = false);
    delete answers[currentQuestion];
    updateQuestionStatus(currentQuestion, 'not-attempted');
}

function previousQuestion() {
    if (currentQuestion > 0) {
        saveAnswer();
        currentQuestion--;
        displayQuestion(currentQuestion);
    }
}

function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
        saveAnswer();
        currentQuestion++;
        displayQuestion(currentQuestion);
    }
}

function updateQuestionStatus(index, status) {
    let statusDiv = document.querySelector(`.question-status div[data-index="${index}"]`);
    statusDiv.className = status;
}

function submitTest() {
    clearInterval(timerInterval);
    saveAnswer();
    analyzePerformance();
    let score = calculateScore();
    showResult(score);
}

function analyzePerformance() {
    performanceAnalysis = {}; // Reset performance analysis
    let allUnanswered = true; // Flag to check if all questions are unanswered

    questions.forEach((question, index) => {
        if (answers[index] !== undefined && question['Correct Answer'] !== undefined) {
            allUnanswered = false; // Mark that at least one question is answered
            if (answers[index] !== question['Correct Answer'].trim()) {
                if (!performanceAnalysis[question.topic]) {
                    performanceAnalysis[question.topic] = 0;
                }
                performanceAnalysis[question.topic]++;
            }
        }
    });

    if (allUnanswered) {
        // If all questions are unanswered, mark all topics as weak
        topicFiles.forEach(topic => {
            performanceAnalysis[topic.name] = 1;
        });
    }

    console.log('Performance analysis:', performanceAnalysis); // Log performance analysis
}

function calculateScore() {
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
        if (answers[i] !== undefined && questions[i]['Correct Answer'] !== undefined) {
            if (answers[i] === questions[i]['Correct Answer'].trim()) {
                score++;
            }
        }
    }
    return score;
}

function initQuestionStatus() {
    let statusContainer = document.querySelector('.question-status');
    statusContainer.innerHTML = '';
    for (let i = 0; i < questions.length; i++) {
        let statusDiv = document.createElement('div');
        statusDiv.setAttribute('data-index', i);
        statusDiv.className = 'not-viewed';
        statusDiv.innerText = i + 1;
        statusContainer.appendChild(statusDiv);
    }
}

function showResult(score) {
    let modal = document.getElementById('result-modal');
    document.getElementById('result-text').innerText = `Your Marks are: ${score}`;
    modal.style.display = 'flex';
    displayRetestSuggestion();
}

function displayRetestSuggestion() {
    let weakTopics = Object.keys(performanceAnalysis).filter(topic => performanceAnalysis[topic] > 0);
    if (weakTopics.length > 0) {
        let suggestionText = 'You are weak in the following topics:\n';
        weakTopics.forEach(topic => {
            suggestionText += `${topic}\n`;
        });
        suggestionText += 'Retest available.';
        document.getElementById('retest-suggestion').innerText = suggestionText;
        document.getElementById('retest-button').style.display = 'inline';
    } else {
        document.getElementById('retest-suggestion').innerText = 'You performed well in all topics.';
        document.getElementById('retest-button').style.display = 'none';
    }
}

function closeModal() {
    let modal = document.getElementById('result-modal');
    modal.style.display = 'none';
}

function retest() {
    let weakTopics = Object.keys(performanceAnalysis).filter(topic => performanceAnalysis[topic] > 0);
    let retestQuestions = [];
    let promises = topicFiles.map((topic, index) => new Promise((resolve, reject) => {
        Papa.parse(topic.file, {
            download: true,
            header: true,
            complete: function(results) {
                results.data.forEach(q => q.topic = topic.name);
                resolve(results.data);
            },
            error: function(error) {
                reject(error);
            }
        });
    }));

    Promise.all(promises).then(dataArrays => {
        dataArrays.forEach(data => {
            let topic = data[0].topic;
            shuffleArray(data);
            if (weakTopics.includes(topic)) {
                retestQuestions = retestQuestions.concat(data.slice(0, 10)); // Select 12 questions from weak topic
            } else {
                retestQuestions = retestQuestions.concat(data.slice(0, 2)); // Select 2 questions from other topics
            }
        });
        shuffleArray(retestQuestions); // Shuffle all questions to mix topics
        questions = retestQuestions;
        currentQuestion = 0;
        answers = {};
        console.log('Retest questions array:', questions); // Log the retest questions array
        initQuestionStatus();
        displayQuestion(currentQuestion);
        startTimer(timerDuration);
        closeModal();
    }).catch(error => {
        console.error("Error loading CSV files:", error);
    });
}

function studyMore() {
    // Redirect to the home page where study materials are present
    window.location.href = 'home.html';  // Change 'home.html' to the actual home page URL
}

function startTimer(duration) {
    clearInterval(timerInterval); // Clear any existing timer
    let timer = duration, minutes, seconds;
    timerInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        document.getElementById('timer').innerText = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

// Load questions when the page loads
window.onload = loadQuestionsFromCSV;
