import { useState, useEffect } from "react";
import { subscribe, getTodos, addTodo, updateTodoStatus, clearTodos, autoCreateTodos, cancelTodo, type TodoItem, type TodoStatus } from "./todo-store";

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>(() => getTodos());

  useEffect(() => {
    const unsub = subscribe(setTodos);
    return unsub;
  }, []);

  return {
    todos,
    addTodo,
    updateTodoStatus,
    cancelTodo,
    clearTodos,
    autoCreateTodos,
  };
}
