# Todoist Clone - Feature Specification

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand (lightweight store)
- **Storage**: localStorage (no backend needed for MVP)
- **Drag & Drop**: @dnd-kit/core
- **Date Parsing**: chrono-node (natural language dates)
- **Icons**: Lucide React

## Core Features (MVP)

### 1. Sidebar Navigation
- Inbox (收件箱)
- Today (今天) - tasks due today
- Upcoming (即将到来) - next 7 days calendar preview
- Filters & Labels (过滤器和标签)
- Projects list (项目列表) with color coding
- Collapsible sidebar

### 2. Task Management
- Quick add task (Ctrl+K or click "+" button)
- Natural language date input ("明天下午3点", "every monday")
- Task title + description
- Priority levels P1(red) P2(orange) P3(yellow) P4(blue/default)
- Due date picker
- Labels (multi-select tags)
- Subtasks (nested tasks)
- Task completion (checkbox with strikethrough animation)
- Delete task
- Edit task inline or in detail panel

### 3. Project Management
- Create project with name + color
- Edit/delete project
- Sections within projects (e.g., "To Do", "In Progress", "Done")
- Project-level task count badge

### 4. Views
- **List View**: Tasks grouped by sections, sortable
- **Board View (Kanban)**: Columns by section or priority
- **Calendar View**: Monthly calendar with tasks on dates

### 5. Smart Views
- **Inbox**: All tasks without a project
- **Today**: Tasks due today + overdue
- **Upcoming**: Tasks due in next 7 days

### 6. Filtering & Search
- Global search (Ctrl+F)
- Filter by: priority, label, project, due date, assignee
- Custom filter expressions (e.g., "p1 & @work")

### 7. Task Detail Panel
- Right-side panel when clicking a task
- Full editing: title, description, priority, date, labels, subtasks
- Activity log (creation time, edits, completions)
- Comments section

### 8. Drag & Drop
- Reorder tasks within a section
- Move tasks between sections
- Move tasks between projects

### 9. Productivity Stats
- Weekly/monthly completion charts
- Streak counter
- Karma points system

### 10. UI/UX
- Responsive (desktop-first)
- Keyboard shortcuts (Ctrl+K quick add, Esc close, etc.)
- Smooth animations/transitions
- Dark/light mode toggle
- Chinese language UI

## Data Model

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string | null; // null = inbox
  sectionId: string | null;
  parentId: string | null; // for subtasks
  priority: 1 | 2 | 3 | 4; // 1=highest(red), 4=lowest(blue)
  labels: string[];
  dueDate: string | null; // ISO date
  isRecurring: boolean;
  recurrenceRule: string | null; // e.g., "every monday"
  isCompleted: boolean;
  completedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  order: number;
  isFavorite: boolean;
  createdAt: string;
}

interface Section {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Comment {
  id: string;
  taskId: string;
  content: string;
  createdAt: string;
}
```
