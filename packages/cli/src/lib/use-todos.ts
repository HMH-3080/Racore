import { useState, useEffect } from "react";
import { useState, useEffect } from "react";
import { subscribe, getTodos, addTodo, updateTodoStatus, clearTodos, cancelTodo, addTodos, type TodoItem, type TodoStatus } from "./todo-store";

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>(() => getTodos());

  useEffect(() => {
    const unsub = subscribe(setTodos);
    return unsub;
  }, []);

  return {
    todos,
    addTodo,
    addTodos,
    updateTodoStatus,
    cancelTodo,
    clearTodos,
  };
}
