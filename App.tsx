
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Calendar,
  Flame,
  LayoutGrid,
  Clock,
  AlertCircle,
  X,
  Pencil,
  Bell,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Todo, FilterType, AssistantResponse } from './types';
import { getSmartMotivation } from './services/geminiService';

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('zentask_todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputText, setInputText] = useState('');
  const [inputDate, setInputDate] = useState('');
  const [inputTime, setInputTime] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null);
  const [isLoadingAssistant, setIsLoadingAssistant] = useState(false);
  
  // 삭제 확인 다이얼로그 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);

  // 편집 다이얼로그 상태
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // 알림 권한 상태
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Persistence
  useEffect(() => {
    localStorage.setItem('zentask_todos', JSON.stringify(todos));
  }, [todos]);

  // Notification Permission Request
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Notification Checker Logic
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentYMD = now.toISOString().split('T')[0];
      const currentHM = now.toTimeString().slice(0, 5);

      setTodos(prev => {
        let changed = false;
        const nextTodos = prev.map(todo => {
          if (!todo.completed && !todo.notified && todo.dueDate === currentYMD && todo.dueTime === currentHM) {
            // Trigger Notification
            if (Notification.permission === 'granted') {
              new Notification("ZenTask 알림", {
                body: `지금 할 일: ${todo.text}`,
                icon: "/favicon.ico" // Placeholder if exists
              });
            }
            changed = true;
            return { ...todo, notified: true };
          }
          return todo;
        });
        return changed ? nextTodos : prev;
      });
    };

    const intervalId = setInterval(checkAlarms, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  // Initial Motivation
  useEffect(() => {
    const fetchAssistant = async () => {
      setIsLoadingAssistant(true);
      const data = await getSmartMotivation(todos.filter(t => !t.completed).length);
      setAssistantData(data);
      setIsLoadingAssistant(false);
    };
    fetchAssistant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerFireworks = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: inputText.trim(),
      completed: false,
      priority: 'medium',
      createdAt: Date.now(),
      dueDate: inputDate || undefined,
      dueTime: inputTime || undefined,
      notified: false
    };

    setTodos([newTodo, ...todos]);
    setInputText('');
    setInputDate('');
    setInputTime('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(todo => {
      if (todo.id === id) {
        const newState = !todo.completed;
        if (newState) triggerFireworks();
        return { ...todo, completed: newState };
      }
      return todo;
    }));
  };

  const requestDelete = (todo: Todo) => {
    setTodoToDelete(todo);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (todoToDelete) {
      setTodos(prev => prev.filter(todo => todo.id !== todoToDelete.id));
      setIsDeleteDialogOpen(false);
      setTodoToDelete(null);
    }
  };

  const openEditModal = (todo: Todo) => {
    setTodoToEdit(todo);
    setEditText(todo.text);
    setEditDate(todo.dueDate || '');
    setEditTime(todo.dueTime || '');
    setIsEditDialogOpen(true);
  };

  const saveEdit = () => {
    if (!todoToEdit || !editText.trim()) return;
    
    setTodos(prev => prev.map(todo => {
      if (todo.id === todoToEdit.id) {
        return {
          ...todo,
          text: editText.trim(),
          dueDate: editDate || undefined,
          dueTime: editTime || undefined,
          // If time or date changed, reset notification status
          notified: (editDate === todo.dueDate && editTime === todo.dueTime) ? todo.notified : false
        };
      }
      return todo;
    }));
    
    setIsEditDialogOpen(false);
    setTodoToEdit(null);
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const completionRate = todos.length === 0 
    ? 0 
    : Math.round((todos.filter(t => t.completed).length / todos.length) * 100);

  const filterLabels: Record<FilterType, string> = {
    all: '전체',
    active: '진행 중',
    completed: '완료됨'
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center p-4 md:p-8">
      {/* Header Section */}
      <header className="w-full max-w-2xl mb-12 mt-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl task-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">ZenTask</h1>
          </div>
          <div className="flex items-center gap-2">
            {notificationPermission !== 'granted' && (
              <button 
                onClick={() => Notification.requestPermission()}
                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors"
                title="알림 권한 요청"
              >
                <Bell className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Assistant Panel */}
        <div className="glass mt-8 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame className="w-16 h-16 text-indigo-500" />
          </div>
          {isLoadingAssistant ? (
            <div className="flex flex-col gap-2 animate-pulse">
              <div className="h-4 w-3/4 bg-zinc-800 rounded"></div>
              <div className="h-3 w-1/2 bg-zinc-800 rounded"></div>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-indigo-300 italic mb-1">
                "{assistantData?.motivation}"
              </p>
              <p className="text-sm text-zinc-400 flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-indigo-500 font-bold">생산성 팁:</span>
                {assistantData?.tip}
              </p>
            </>
          )}
        </div>
      </header>

      {/* Stats Card */}
      <div className="w-full max-w-2xl mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="전체" value={todos.length} />
        <StatCard label="완료" value={todos.filter(t => t.completed).length} />
        <StatCard label="진행 중" value={todos.filter(t => !t.completed).length} />
        <StatCard label="달성률" value={`${completionRate}%`} isAccent />
      </div>

      <main className="w-full max-w-2xl">
        {/* Add Input with Date & Time */}
        <form onSubmit={addTodo} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8 shadow-xl flex flex-col gap-4">
          <div className="relative group">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="새로운 목표를 기록하세요..."
              className="w-full bg-transparent py-2 px-2 focus:outline-none text-zinc-100 placeholder:text-zinc-600 border-b border-zinc-800 focus:border-indigo-500 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-lg px-2 py-1">
                <Calendar className="w-4 h-4" />
                <input
                  type="date"
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none transition-all text-zinc-300 [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-2 text-zinc-500 bg-zinc-800/50 border border-zinc-700 rounded-lg px-2 py-1">
                <Clock className="w-4 h-4" />
                <input
                  type="time"
                  value={inputTime}
                  onChange={(e) => setInputTime(e.target.value)}
                  className="bg-transparent text-sm focus:outline-none transition-all text-zinc-300 [color-scheme:dark]"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="ml-auto px-6 py-2 task-gradient rounded-xl flex items-center gap-2 text-white font-semibold hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-indigo-500/30"
            >
              <Plus className="w-5 h-5" />
              추가
            </button>
          </div>
        </form>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-zinc-100 text-zinc-950 shadow-lg shadow-white/10' 
                  : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 border border-zinc-800'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          <AnimatePresence mode='popLayout'>
            {filteredTodos.length > 0 ? (
              filteredTodos.map((todo) => (
                <TodoItem 
                  key={todo.id} 
                  todo={todo} 
                  onToggle={toggleTodo} 
                  onDelete={() => requestDelete(todo)}
                  onEdit={() => openEditModal(todo)}
                />
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 text-zinc-600 flex flex-col items-center"
              >
                <LayoutGrid className="w-12 h-12 mb-4 opacity-20" />
                <p>현재 목록이 비어 있습니다.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {isDeleteDialogOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteDialogOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass rounded-3xl p-6 shadow-2xl border border-zinc-800 overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <button onClick={() => setIsDeleteDialogOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <h3 className="text-xl font-bold mb-2">목표 삭제</h3>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                "<span className="text-zinc-200">{todoToDelete?.text}</span>" 항목을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 font-medium hover:bg-zinc-800 transition-colors">
                  취소
                </button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  삭제하기
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditDialogOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditDialogOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md glass rounded-3xl p-6 shadow-2xl border border-zinc-800 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-indigo-400" />
                  할 일 편집
                </h3>
                <button onClick={() => setIsEditDialogOpen(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">내용</label>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">마감 날짜</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none text-sm text-zinc-300 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">마감 시간</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none text-sm text-zinc-300 [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setIsEditDialogOpen(false)} className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 font-medium hover:bg-zinc-800 transition-colors">
                  취소
                </button>
                <button onClick={saveEdit} className="flex-1 py-3 rounded-2xl task-gradient text-white font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progress Bar Footer */}
      <footer className="fixed bottom-0 left-0 w-full p-6 pointer-events-none">
        <div className="max-w-2xl mx-auto">
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              className="h-full task-gradient"
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string | number, isAccent?: boolean }> = ({ label, value, isAccent }) => (
  <div className={`p-4 rounded-2xl border transition-all ${isAccent ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-zinc-900/50 border-zinc-800'}`}>
    <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</div>
    <div className={`text-2xl font-bold ${isAccent ? 'text-indigo-400' : 'text-zinc-100'}`}>{value}</div>
  </div>
);

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: () => void;
  onEdit: () => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete, onEdit }) => {
  const isOverdue = useCallback(() => {
    if (!todo.dueDate || todo.completed) return false;
    const now = new Date();
    const dueStr = todo.dueTime ? `${todo.dueDate}T${todo.dueTime}` : `${todo.dueDate}T23:59:59`;
    const due = new Date(dueStr);
    return due < now;
  }, [todo.dueDate, todo.dueTime, todo.completed])();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, x: -20 }}
      className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
        todo.completed 
          ? 'bg-zinc-900/30 border-zinc-900 opacity-60' 
          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-md'
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => onToggle(todo.id)}
          className={`flex-shrink-0 transition-all duration-300 transform active:scale-90 ${
            todo.completed ? 'text-indigo-500' : 'text-zinc-700 hover:text-zinc-500'
          }`}
        >
          {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </button>
        <div className="flex flex-col">
          <span className={`text-base font-medium transition-all ${
            todo.completed ? 'line-through text-zinc-600' : 'text-zinc-200'
          }`}>
            {todo.text}
          </span>
          {(todo.dueDate || todo.dueTime) && (
            <div className={`flex items-center gap-1.5 text-xs mt-1 ${
              isOverdue ? 'text-red-400' : 'text-zinc-500'
            }`}>
              <Clock className="w-3 h-3" />
              <span>
                {todo.dueDate && `${todo.dueDate} `}
                {todo.dueTime && `${todo.dueTime} `}
                마감
              </span>
              {isOverdue && <span className="ml-1 font-bold">● 기한 지남</span>}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-zinc-700 hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-indigo-500/10"
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-zinc-700 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};

export default App;
