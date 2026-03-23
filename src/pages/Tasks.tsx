import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load tasks");
      console.error(error);
    } else {
      setTasks((data as Task[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;

    const { error } = await supabase
      .from("tasks")
      .insert({ title: newTask.trim(), user_id: user.id });

    if (error) {
      toast.error("Failed to add task");
    } else {
      setNewTask("");
      fetchTasks();
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update task");
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete task");
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const done = tasks.filter((t) => t.completed).length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            My Tasks
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tasks.length > 0
              ? `${done}/${tasks.length} completed ✨`
              : "Apne tasks yahan organize karo!"}
          </p>
        </div>

        {/* Add task */}
        <form onSubmit={addTask} className="flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task…"
            className="flex-1 bg-secondary/50 border-border/50 h-11"
          />
          <Button
            type="submit"
            disabled={!newTask.trim()}
            size="icon"
            className="h-11 w-11 shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(340,72%,62%), hsl(280,50%,60%))" }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Task list */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">
              Loading tasks…
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-muted-foreground text-sm">
                Koi task nahi hai abhi. Naya task add karo! 📝
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3 group transition-all duration-200 hover:bg-secondary/20"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id, task.completed)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span
                  className={`flex-1 text-sm transition-all ${
                    task.completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {task.title}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
