'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar,
  Clock, 
  Flag,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isTomorrow, isThisWeek } from 'date-fns'

export interface Task {
  id: string
  title: string
  description?: string
  type: 'content' | 'review' | 'publish' | 'audit' | 'seo' | 'media' | 'social' | 'general'
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date
  assignee?: {
    name: string
    email: string
    avatar?: string
  }
  tags?: string[]
  metadata?: {
    contentId?: string
    contentType?: string
    [key: string]: any
  }
  progress?: number
  estimatedTime?: number // in minutes
}

export interface TaskManagerProps {
  tasks: Task[]
  loading?: boolean
  title?: string
  showHeader?: boolean
  maxItems?: number
  onTaskComplete?: (taskId: string) => void
  onTaskEdit?: (task: Task) => void
  onTaskDelete?: (taskId: string) => void
  onCreateTask?: () => void
  onViewAll?: () => void
  compact?: boolean
}

export function TaskManager({
  tasks,
  loading = false,
  title = "Upcoming Tasks",
  showHeader = true,
  maxItems,
  onTaskComplete,
  onTaskEdit,
  onTaskDelete,
  onCreateTask,
  onViewAll,
  compact = false
}: TaskManagerProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  
  const displayTasks = maxItems ? tasks.slice(0, maxItems) : tasks

  const getTypeIcon = (type: Task['type']) => {
    const iconClass = "h-4 w-4"
    
    switch (type) {
      case 'content':
        return <FileText className={iconClass} />
      case 'review':
        return <CheckCircle2 className={iconClass} />
      case 'publish':
        return <Calendar className={iconClass} />
      case 'audit':
        return <AlertTriangle className={iconClass} />
      case 'seo':
        return <FileText className={iconClass} />
      case 'media':
        return <FileText className={iconClass} />
      case 'social':
        return <FileText className={iconClass} />
      default:
        return <FileText className={iconClass} />
    }
  }

  const getTypeColor = (type: Task['type']) => {
    switch (type) {
      case 'content':
        return 'bg-blue-100 text-blue-700'
      case 'review':
        return 'bg-amber-100 text-amber-700'
      case 'publish':
        return 'bg-green-100 text-green-700'
      case 'audit':
        return 'bg-purple-100 text-purple-700'
      case 'seo':
        return 'bg-indigo-100 text-indigo-700'
      case 'media':
        return 'bg-pink-100 text-pink-700'
      case 'social':
        return 'bg-cyan-100 text-cyan-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500'
      case 'high':
        return 'bg-orange-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50'
      case 'overdue':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-slate-600 bg-slate-50'
    }
  }

  const formatDueDate = (date: Date) => {
    if (isToday(date)) {
      return `Today, ${format(date, 'HH:mm')}`
    } else if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'HH:mm')}`
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE, HH:mm')
    } else {
      return format(date, 'MMM d, HH:mm')
    }
  }

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    if (completed && onTaskComplete) {
      onTaskComplete(taskId)
    }
  }

  const handleSelectTask = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedTasks)
    if (selected) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTasks(newSelected)
  }

  if (loading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "pt-0" : ""}>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 animate-pulse">
                <div className="w-4 h-4 bg-slate-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
            <div className="flex items-center gap-2">
              {onCreateTask && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onCreateTask}
                  className="text-violet-600 hover:text-violet-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Task
                </Button>
              )}
              {onViewAll && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onViewAll}
                  className="text-slate-600 hover:text-slate-700"
                >
                  View all
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className={showHeader ? "pt-0" : ""}>
        {displayTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All caught up! No pending tasks.</p>
            {onCreateTask && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onCreateTask}
                className="mt-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create your first task
              </Button>
            )}
          </div>
        ) : (
          <div className={`space-y-${compact ? '2' : '3'}`}>
            {displayTasks.map((task) => (
              <div
                key={task.id}
                className={`
                  group relative flex items-start space-x-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-all
                  ${task.status === 'completed' ? 'opacity-60' : ''}
                  ${compact ? 'py-2' : 'py-3'}
                `}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0 pt-0.5">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => 
                      handleTaskToggle(task.id, checked as boolean)
                    }
                    className="h-4 w-4"
                  />
                </div>

                {/* Task content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Title and type */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`
                          w-6 h-6 rounded flex items-center justify-center
                          ${getTypeColor(task.type)}
                        `}>
                          {getTypeIcon(task.type)}
                        </div>
                        <h4 className={`font-medium text-slate-900 ${compact ? 'text-sm' : ''} ${
                          task.status === 'completed' ? 'line-through' : ''
                        }`}>
                          {task.title}
                        </h4>
                        
                        {/* Priority indicator */}
                        <div 
                          className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                          title={`${task.priority} priority`}
                        />
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className={`text-slate-600 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                          {task.description}
                        </p>
                      )}

                      {/* Meta information */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {/* Due date */}
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className={
                              task.status === 'overdue' ? 'text-red-600' : ''
                            }>
                              {formatDueDate(task.dueDate)}
                            </span>
                          </div>
                        )}

                        {/* Assignee */}
                        {task.assignee && (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={task.assignee.avatar} />
                              <AvatarFallback className="text-[8px]">
                                {task.assignee.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span>{task.assignee.name}</span>
                          </div>
                        )}

                        {/* Estimated time */}
                        {task.estimatedTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.estimatedTime}m</span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {typeof task.progress === 'number' && task.progress > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-violet-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          {task.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {task.tags.length > 3 && (
                            <span className="text-xs text-slate-400">
                              +{task.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onTaskEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onTaskEdit(task)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {onTaskDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={() => onTaskDelete(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more indicator */}
        {maxItems && tasks.length > maxItems && (
          <div className="text-center pt-4 border-t border-slate-100 mt-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onViewAll}
              className="text-slate-600 hover:text-violet-600"
            >
              Show {tasks.length - maxItems} more tasks
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}