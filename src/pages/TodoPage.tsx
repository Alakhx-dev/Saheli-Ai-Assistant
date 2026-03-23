import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Plus, Trash2, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadProfile } from "@/lib/auth";
import { getTodos, addTodo, deleteTodo, toggleTodo, type Todo } from "@/lib/local-storage";
import FloatingElements from "@/components/FloatingElements";

export default function TodoPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(loadProfile());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    if (!profile.isLoggedIn) {
      navigate("/login");
    }
    loadTodos();
  }, [profile, navigate]);

  const loadTodos = () => {
    setTodos(getTodos());
  };

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      addTodo(newTodoTitle);
      setNewTodoTitle("");
      loadTodos();
    }
  };

  const handleToggleTodo = (id: string) => {
    toggleTodo(id);
    loadTodos();
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodo(id);
    loadTodos();
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.completed).length,
    active: todos.filter((t) => !t.completed).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 overflow-hidden relative">
      <FloatingElements />

      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-xl border-b border-white/20 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/dashboard")}
              className="text-white hover:text-purple-300"
            >
              <ArrowLeft size={24} />
            </motion.button>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-purple-400" fill="currentColor" />
              <span className="text-2xl font-bold text-white">Saheli AI</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-2">📝 My Tasks</h1>
            <p className="text-purple-200">Stay organized and complete your goals</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            {[
              { label: "Total", value: stats.total, color: "from-purple-500 to-pink-500" },
              { label: "Active", value: stats.active, color: "from-blue-500 to-cyan-500" },
              { label: "Done", value: stats.completed, color: "from-green-500 to-emerald-500" },
            ].map((stat, i) => (
              <Card
                key={i}
                className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 text-center"
              >
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
                <p className="text-purple-200 text-sm mt-1">{stat.label}</p>
              </Card>
            ))}
          </motion.div>

          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 p-6">
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Add a new task..."
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTodo()}
                  className="bg-white/10 border border-white/20 text-white placeholder-purple-300/50 rounded-lg flex-1"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddTodo}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 rounded-lg flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add
                </motion.button>
              </div>
            </Card>
          </motion.div>

          {/* Filter Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex gap-3 mb-8"
          >
            {(["all", "active", "completed"] as const).map((f) => (
              <motion.button
                key={f}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filter === f
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    : "bg-white/10 text-purple-200 hover:bg-white/20"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </motion.button>
            ))}
          </motion.div>

          {/* Todos List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <AnimatePresence>
              {filteredTodos.length > 0 ? (
                <div className="space-y-3">
                  {filteredTodos.map((todo, i) => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 flex items-center gap-4 hover:bg-white/15 transition-all">
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleToggleTodo(todo.id)}
                          className="text-purple-300 hover:text-purple-200 flex-shrink-0"
                        >
                          {todo.completed ? (
                            <CheckCircle2 size={24} className="text-green-400" />
                          ) : (
                            <Circle size={24} />
                          )}
                        </motion.button>

                        <div className="flex-1">
                          <p
                            className={`text-lg font-semibold ${
                              todo.completed
                                ? "text-purple-300 line-through"
                                : "text-white"
                            }`}
                          >
                            {todo.title}
                          </p>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="text-red-300 hover:text-red-200 flex-shrink-0"
                        >
                          <Trash2 size={20} />
                        </motion.button>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <Sparkles size={48} className="mx-auto text-purple-400 mb-4 opacity-50" />
                  <p className="text-purple-200 text-lg">
                    {filter === "completed"
                      ? "No completed tasks yet"
                      : "No tasks to show"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
