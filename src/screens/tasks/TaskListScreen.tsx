import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setTasks, setSummary } from '../../store/slices/taskSlice';
import { taskApi } from '../../services/api';
import { Task } from '../../types/task.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate, getRelativeDate } from '../../utils/dateUtils';

type TaskStackNavProp = StackNavigationProp<{ TaskList: undefined; TaskDetail: { taskId: string } }>;

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation<TaskStackNavProp>();
  const dispatch = useAppDispatch();

  const { tasks, summary } = useAppSelector((state) => state.task);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');

  useEffect(() => {
    fetchTasks();
    fetchSummary();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      setError(null);
      let data: Task[] = [];

      if (filter === 'overdue') {
        data = await taskApi.getOverdueTasks();
      } else {
        data = await taskApi.getMyTasks();
        if (filter === 'pending') {
          data = data.filter(t => t.status === 'Pending' || t.status === 'In Progress');
        }
      }

      dispatch(setTasks(data));
    } catch (err: any) {
      console.error('Fetch tasks error:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const summaryData = await taskApi.getTaskSummary();
      dispatch(setSummary(summaryData));
    } catch (error) {
      console.error('Fetch summary error:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
    fetchSummary();
  };

  const handleTaskPress = (task: Task) => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return COLORS.error;
      case 'High':
        return COLORS.warning;
      case 'Medium':
        return COLORS.info;
      case 'Low':
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return COLORS.success;
      case 'In Progress':
        return COLORS.info;
      case 'Cancelled':
        return COLORS.textSecondary;
      default:
        return COLORS.warning;
    }
  };

  const renderTaskCard = ({ item }: { item: Task }) => {
    const isOverdue = new Date(item.dueDate) < new Date() && item.status !== 'Completed';

    return (
      <TouchableOpacity onPress={() => handleTaskPress(item)} activeOpacity={0.7}>
        <Card style={styles.taskCard}>
          <View style={styles.cardHeader}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.dueDate}>
              <MaterialCommunityIcons
                name={isOverdue ? 'alert-circle' : 'calendar'}
                size={16}
                color={isOverdue ? COLORS.error : COLORS.textSecondary}
              />
              <Text style={[styles.dueDateText, isOverdue && styles.overdueDateText]}>
                {isOverdue ? 'Overdue: ' : ''}{getRelativeDate(item.dueDate)}
              </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>

          {item.assignedByName && (
            <View style={styles.assignedBy}>
              <MaterialCommunityIcons name="account" size={14} color={COLORS.textSecondary} />
              <Text style={styles.assignedByText}>Assigned by {item.assignedByName}</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="clipboard-check-outline" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>
          {filter === 'overdue' ? 'No overdue tasks' : filter === 'pending' ? 'No pending tasks' : 'No tasks found'}
        </Text>
      </View>
    );
  };

  if (error && !refreshing) {
    return <ErrorMessage message={error} onRetry={fetchTasks} />;
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      {summary && (
        <View style={styles.summaryContainer}>
          <TouchableOpacity
            style={[styles.summaryCard, filter === 'pending' && styles.summaryCardActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={styles.summaryValue}>{summary.pendingTasks}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.summaryCard, filter === 'overdue' && styles.summaryCardActive]}
            onPress={() => setFilter('overdue')}
          >
            <Text style={[styles.summaryValue, { color: COLORS.error }]}>
              {summary.overdueTasks}
            </Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.summaryCard, filter === 'all' && styles.summaryCardActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              {summary.completedTasks}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task List */}
      <FlatList
        data={tasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={renderEmpty}
      />

      <Loading visible={loading && !refreshing} message="Loading tasks..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    gap: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  summaryCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  summaryValue: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  listContent: {
    padding: SIZES.paddingMD,
  },
  taskCard: {
    marginBottom: SIZES.paddingMD,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingSM,
  },
  taskInfo: {
    flex: 1,
    marginRight: SIZES.paddingMD,
  },
  taskTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  priorityText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
  },
  dueDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDateText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  overdueDateText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSM,
  },
  statusText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },
  assignedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  assignedByText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: SIZES.fontLG,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingMD,
  },
});

export default TaskListScreen;
