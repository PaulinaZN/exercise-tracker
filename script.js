document.addEventListener('DOMContentLoaded', function() {
    const createUserForm = document.getElementById('create-user-form');
    const addExerciseForm = document.getElementById('add-exercise-form');
    const viewLogForm = document.getElementById('view-log-form');
    const loadUsersBtn = document.getElementById('load-users-btn');
    const userResult = document.getElementById('user-result');
    const exerciseResult = document.getElementById('exercise-result');
    const logResult = document.getElementById('log-result');
    const usersList = document.getElementById('users-list');

    // Helper function para mostrar resultados
    function showResult(element, data, isError = false) {
        if (isError) {
            element.innerHTML = `<strong>Error:</strong> ${data.error || data}`;
            element.style.borderLeftColor = '#dc3545';
        } else {
            element.innerHTML = `<strong>Success:</strong>\n${JSON.stringify(data, null, 2)}`;
            element.style.borderLeftColor = '#28a745';
        }
    }

    // Crear usuario
    createUserForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        
        if (!username) {
            showResult(userResult, 'Username is required', true);
            return;
        }
        
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showResult(userResult, data);
            } else {
                showResult(userResult, data, true);
            }
        } catch (error) {
            showResult(userResult, error.message, true);
        }
        
        createUserForm.reset();
    });

    // Agregar ejercicio
    addExerciseForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('user-id').value.trim();
        const description = document.getElementById('description').value.trim();
        const duration = document.getElementById('duration').value;
        const date = document.getElementById('date').value;
        
        if (!userId || !description || !duration) {
            showResult(exerciseResult, 'All fields except date are required', true);
            return;
        }
        
        const exerciseData = {
            description,
            duration: parseInt(duration)
        };
        
        if (date) {
            exerciseData.date = date;
        }
        
        try {
            const response = await fetch(`/api/users/${userId}/exercises`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exerciseData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showResult(exerciseResult, data);
            } else {
                showResult(exerciseResult, data, true);
            }
        } catch (error) {
            showResult(exerciseResult, error.message, true);
        }
        
        addExerciseForm.reset();
    });

    // Ver registro
    viewLogForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('log-user-id').value.trim();
        const from = document.getElementById('from').value;
        const to = document.getElementById('to').value;
        const limit = document.getElementById('limit').value;
        
        if (!userId) {
            showResult(logResult, 'User ID is required', true);
            return;
        }
        
        let url = `/api/users/${userId}/logs`;
        const params = new URLSearchParams();
        
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (limit) params.append('limit', limit);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                showResult(logResult, data);
            } else {
                showResult(logResult, data, true);
            }
        } catch (error) {
            showResult(logResult, error.message, true);
        }
        
        viewLogForm.reset();
    });

    // Cargar lista de usuarios
    loadUsersBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();
            
            if (response.ok) {
                usersList.innerHTML = '';
                
                if (users.length === 0) {
                    usersList.innerHTML = '<p>No users registered yet</p>';
                    return;
                }
                
                users.forEach(user => {
                    const userCard = document.createElement('div');
                    userCard.className = 'user-card';
                    userCard.innerHTML = `
                        <p class="user-id"><strong>ID:</strong> ${user._id}</p>
                        <p class="user-name"><strong>Username:</strong> ${user.username}</p>
                    `;
                    usersList.appendChild(userCard);
                });
            } else {
                usersList.innerHTML = '<p>Error loading users</p>';
            }
        } catch (error) {
            usersList.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    });
});
