// js/widgets/todoWidget.js

const TodoWidget = {
    tasks: [], // Array to hold task objects {id, text, completed}
    todoInput: null,
    addTodoBtn: null,
    todoListArea: null,

    init: function() {
        this.todoInput = document.getElementById('todoInput');
        this.addTodoBtn = document.getElementById('addTodoBtn');
        this.todoListArea = document.getElementById('todoListArea');

        if (!this.todoInput || !this.addTodoBtn || !this.todoListArea) {
            console.error("TodoWidget: Could not find all required DOM elements (#todoInput, #addTodoBtn, #todoListArea).");
            // Attempt to find the main widget div to display an error if parts are missing
            const mainTodoDiv = document.getElementById('todo-widget');
            if(mainTodoDiv) mainTodoDiv.innerHTML = "<p>To-Do List could not initialize.</p>";
            return;
        }

        this._loadTasks();
        this._addEventListeners();
    },

    _addEventListeners: function() {
        this.addTodoBtn.addEventListener('click', () => this._addTask());
        this.todoInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this._addTask();
            }
        });

        // Event delegation for complete/delete actions on task items
        this.todoListArea.addEventListener('click', (event) => {
            const target = event.target;
            const taskItem = target.closest('.todo-item'); // Find the parent li.todo-item
            if (!taskItem) return;

            const taskId = taskItem.dataset.id;

            if (target.classList.contains('todo-complete-checkbox')) {
                this._toggleCompleteTask(taskId);
            } else if (target.classList.contains('todo-delete-btn') || target.parentElement.classList.contains('todo-delete-btn')) {
                // Handle click on button or its icon if it's nested
                this._deleteTask(taskId);
            }
        });
    },

    _loadTasks: function() {
        chrome.storage.sync.get({todoTasks: []}, (data) => { // Default to empty array if not found
            if (chrome.runtime.lastError) {
                console.error("TodoWidget: Error loading tasks:", chrome.runtime.lastError.message);
                this.tasks = [];
            } else {
                this.tasks = Array.isArray(data.todoTasks) ? data.todoTasks : [];
            }
            this._renderTasks();
        });
    },

    _saveTasks: function() {
        chrome.storage.sync.set({todoTasks: this.tasks}, () => {
            if (chrome.runtime.lastError) {
                console.error("TodoWidget: Error saving tasks:", chrome.runtime.lastError.message);
            }
            // console.log("TodoWidget: Tasks saved."); // For debugging
        });
    },

    _renderTasks: function() {
        if (!this.todoListArea) return;
        this.todoListArea.innerHTML = ''; // Clear existing tasks

        if (this.tasks.length === 0) {
            this.todoListArea.innerHTML = '<li class="todo-empty-message">No tasks yet. Add one above!</li>';
            return;
        }

        this.tasks.forEach(task => {
            const taskLi = document.createElement('li');
            taskLi.className = `todo-item ${task.completed ? 'completed' : ''}`;
            taskLi.dataset.id = task.id;

            // Sanitize task text before inserting (basic sanitization)
            const taskTextNode = document.createTextNode(task.text);
            const taskTextSpan = document.createElement('span');
            taskTextSpan.className = 'todo-text';
            taskTextSpan.appendChild(taskTextNode);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-complete-checkbox';
            checkbox.checked = task.completed;
            // The data-id for the checkbox is not strictly needed if we get it from parent li

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'todo-delete-btn';
            deleteBtn.innerHTML = '🗑️'; // Trash can emoji or an icon
            deleteBtn.title = 'Delete task';


            taskLi.appendChild(checkbox);
            taskLi.appendChild(taskTextSpan);
            taskLi.appendChild(deleteBtn);
            
            this.todoListArea.appendChild(taskLi);
        });
    },

    _addTask: function() {
        const taskText = this.todoInput.value.trim();
        if (taskText === '') {
            // Optionally provide feedback like a shake or a small message
            return;
        }

        const newTask = {
            id: Date.now().toString(), // Simple unique ID
            text: taskText,
            completed: false
        };

        this.tasks.push(newTask);
        this._saveTasks();
        this._renderTasks();
        this.todoInput.value = ''; // Clear input field
        this.todoInput.focus();
    },

    _toggleCompleteTask: function(taskId) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex > -1) {
            this.tasks[taskIndex].completed = !this.tasks[taskIndex].completed;
            this._saveTasks();
            this._renderTasks();
        }
    },

    _deleteTask: function(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this._saveTasks();
        this._renderTasks();
    }
};