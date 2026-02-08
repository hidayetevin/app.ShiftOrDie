import { CONFIG } from '../core/Config';

export class ProgressionManager {
    constructor() {
        this.data = this.loadData();
        this.initTasks();
        this.coinsEarnedThisRun = 0;
    }

    resetRun() {
        this.coinsEarnedThisRun = 0;
    }

    addCoin(amount = 1) {
        this.coinsEarnedThisRun += amount;
        this.data.total_coins += amount;
        this.saveData();
    }

    loadData() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.DATA);
        const defaultData = {
            total_coins: 0,
            has_played: false,
            unlocked_styles: ['neon'],
            selected_style: 'neon',
            last_task_date: '',
            daily_tasks: []
        };
        return saved ? JSON.parse(saved) : defaultData;
    }

    saveData() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.DATA, JSON.stringify(this.data));
    }

    initTasks() {
        const today = new Date().toDateString();
        if (this.data.last_task_date !== today) {
            this.generateDailyTasks();
            this.data.last_task_date = today;
            this.saveData();
        }
    }

    generateDailyTasks() {
        const taskPool = [
            { id: 'survive_30', type: 'survival', target: 30, reward: 100, label: 'Survive 30s' },
            { id: 'shifts_50', type: 'action', target: 50, reward: 100, label: 'Make 50 shifts' },
            { id: 'perfect_10', type: 'skill', target: 10, reward: 150, label: 'Get 10 perfect shifts' }
        ];

        // In a real app we might randomize, for now we take the definitive 3 from analysis §11
        this.data.daily_tasks = taskPool.map(task => ({
            ...task,
            progress: 0,
            completed: false,
            claimed: false
        }));
    }

    updateTaskProgress(type, amount = 1) {
        let changed = false;
        this.data.daily_tasks.forEach(task => {
            if (task.type === type && !task.completed) {
                task.progress += amount;
                if (task.progress >= task.target) {
                    task.progress = task.target;
                    task.completed = true;
                }
                changed = true;
            }
        });
        if (changed) this.saveData();
    }

    claimReward(taskId) {
        const task = this.data.daily_tasks.find(t => t.id === taskId);
        if (task && task.completed && !task.claimed) {
            this.data.total_coins += task.reward;
            task.claimed = true;
            this.saveData();
            return task.reward;
        }
        return 0;
    }

    getTimeUntilReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    }

    unlockStyle(styleId, price) {
        if (this.data.total_coins >= price && !this.data.unlocked_styles.includes(styleId)) {
            this.data.total_coins -= price;
            this.data.unlocked_styles.push(styleId);
            this.saveData();
            return true;
        }
        return false;
    }
}
