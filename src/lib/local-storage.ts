// LocalStorage utilities for managing app data

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  dueDate?: number;
}

export interface FitCheckHistory {
  id: string;
  timestamp: number;
  feedback: string;
  imageData?: string;
}

const TODOS_KEY = "saheli_todos";
const FITCHECK_KEY = "saheli_fitcheck_history";

// Todos
export function getTodos(): Todo[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(TODOS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addTodo(title: string, dueDate?: number): Todo {
  const todo: Todo = {
    id: Date.now().toString(),
    title,
    completed: false,
    createdAt: Date.now(),
    dueDate,
  };

  const todos = getTodos();
  todos.push(todo);
  saveTodos(todos);
  return todo;
}

export function updateTodo(id: string, updates: Partial<Todo>): void {
  const todos = getTodos();
  const index = todos.findIndex((t) => t.id === id);
  if (index > -1) {
    todos[index] = { ...todos[index], ...updates };
    saveTodos(todos);
  }
}

export function deleteTodo(id: string): void {
  const todos = getTodos().filter((t) => t.id !== id);
  saveTodos(todos);
}

export function toggleTodo(id: string): void {
  const todos = getTodos();
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos(todos);
  }
}

export function saveTodos(todos: Todo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
  } catch (e) {
    console.error("Failed to save todos:", e);
  }
}

// Fit Check History
export function getFitCheckHistory(): FitCheckHistory[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FITCHECK_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addFitCheckRecord(feedback: string, imageData?: string): FitCheckHistory {
  const record: FitCheckHistory = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    feedback,
    imageData,
  };

  const history = getFitCheckHistory();
  history.push(record);
  saveFitCheckHistory(history);
  return record;
}

export function saveFitCheckHistory(history: FitCheckHistory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FITCHECK_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save fit check history:", e);
  }
}

export function deleteFitCheckRecord(id: string): void {
  const history = getFitCheckHistory().filter((r) => r.id !== id);
  saveFitCheckHistory(history);
}
