export interface WorkProgramItem {
  id: string;
  title: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  progressPercent: number;
  budgetPlanned: number;
  budgetUsed: number;
}

export interface TaskSummaryItem {
  id: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
}

export function calculateProgramMetrics(programs: WorkProgramItem[]) {
  if (programs.length === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      planning: 0,
      averageProgress: 0,
      totalBudgetPlanned: 0,
      totalBudgetUsed: 0,
    };
  }

  let completed = 0;
  let inProgress = 0;
  let planning = 0;
  let totalProgress = 0;
  let totalBudgetPlanned = 0;
  let totalBudgetUsed = 0;

  for (const prog of programs) {
    if (prog.status === 'completed') completed++;
    else if (prog.status === 'in_progress') inProgress++;
    else if (prog.status === 'planning') planning++;

    totalProgress += prog.progressPercent;
    totalBudgetPlanned += prog.budgetPlanned;
    totalBudgetUsed += prog.budgetUsed;
  }

  return {
    total: programs.length,
    completed,
    inProgress,
    planning,
    averageProgress: Math.round(totalProgress / programs.length),
    totalBudgetPlanned,
    totalBudgetUsed,
  };
}

export function calculateTaskMetrics(tasks: TaskSummaryItem[], referenceDateStr?: string) {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();

  let todo = 0;
  let inProgress = 0;
  let review = 0;
  let done = 0;
  let urgent = 0;
  let overdue = 0;

  for (const t of tasks) {
    if (t.status === 'done') {
      done++;
    } else {
      if (t.status === 'todo') todo++;
      else if (t.status === 'in_progress') inProgress++;
      else if (t.status === 'review') review++;

      if (t.priority === 'urgent' || t.priority === 'high') {
        urgent++;
      }

      if (t.dueDate) {
        const due = new Date(t.dueDate);
        if (due < refDate) {
          overdue++;
        }
      }
    }
  }

  const completionRate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return {
    total: tasks.length,
    todo,
    inProgress,
    review,
    done,
    urgent,
    overdue,
    completionRate,
  };
}
