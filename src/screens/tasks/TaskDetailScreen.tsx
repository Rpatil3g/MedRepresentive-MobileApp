import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Loading, ErrorMessage, Button, Input } from '../../components/common';
import { useAppDispatch } from '../../store/hooks';
import { updateTask } from '../../store/slices/taskSlice';
import { taskApi } from '../../services/api';
import { Task } from '../../types/task.types';
import { COLORS, SIZES } from '../../constants';
import { formatDateTime } from '../../utils/dateUtils';
import { showAlert } from '../../utils/helpers';

type TaskDetailRouteProp = RouteProp<{ TaskDetail: { taskId: string } }, 'TaskDetail'>;

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<TaskDetailRouteProp>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    fetchTaskDetail();
  }, [taskId]);

  const fetchTaskDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getTaskById(taskId);
      setTask(data);
    } catch (err: any) {
      console.error('Fetch task detail error:', err);
      setError('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    try {
      setCompleting(true);

      const updatedTask = await taskApi.completeTask({
        taskId: taskId,
        completionNotes: completionNotes || undefined,
      });

      dispatch(updateTask(updatedTask));

      showAlert('Success', 'Task marked as completed!', () => {
        navigation.goBack();
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to complete task';
      showAlert('Error', errorMessage);
    } finally {
      setCompleting(false);
    }
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

  if (loading) {
    return <Loading visible={loading} message="Loading task details..." />;
  }

  if (error || !task) {
    return <ErrorMessage message={error || 'Task not found'} onRetry={fetchTaskDetail} />;
  }

  const isCompleted = task.status === 'Completed';
  const isOverdue = new Date(task.dueDate) < new Date() && !isCompleted;

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
            <Text style={styles.priorityText}>{task.priority} Priority</Text>
          </View>
          <View style={[styles.statusBadge, isCompleted && styles.statusBadgeCompleted]}>
            <Text style={[styles.statusText, isCompleted && styles.statusTextCompleted]}>
              {task.status}
            </Text>
          </View>
        </View>

        <Text style={styles.taskTitle}>{task.title}</Text>

        {task.description && (
          <Text style={styles.taskDescription}>{task.description}</Text>
        )}
      </Card>

      {/* Task Info */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Task Information</Text>

        <InfoRow
          icon="calendar"
          label="Due Date"
          value={formatDateTime(task.dueDate)}
          valueColor={isOverdue ? COLORS.error : undefined}
        />

        {task.assignedByName && (
          <InfoRow icon="account" label="Assigned By" value={task.assignedByName} />
        )}

        <InfoRow icon="clock" label="Created" value={formatDateTime(task.createdAt)} />

        {task.completedAt && (
          <InfoRow
            icon="check-circle"
            label="Completed"
            value={formatDateTime(task.completedAt)}
          />
        )}
      </Card>

      {/* Completion Notes */}
      {task.completionNotes && (
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Completion Notes</Text>
          <Text style={styles.notesText}>{task.completionNotes}</Text>
        </Card>
      )}

      {/* Complete Task Section */}
      {!isCompleted && (
        <Card style={styles.completeCard}>
          {!showCompleteForm ? (
            <Button
              title="Mark as Complete"
              onPress={() => setShowCompleteForm(true)}
              icon={
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={COLORS.textWhite}
                  style={{ marginRight: 8 }}
                />
              }
            />
          ) : (
            <>
              <Text style={styles.formTitle}>Complete Task</Text>

              <Input
                label="Completion Notes (Optional)"
                placeholder="Add any completion notes or comments"
                icon="note-text"
                multiline
                numberOfLines={4}
                value={completionNotes}
                onChangeText={setCompletionNotes}
              />

              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowCompleteForm(false)}
                  style={styles.cancelButton}
                />
                <Button
                  title="Confirm Complete"
                  onPress={handleCompleteTask}
                  loading={completing}
                  style={styles.confirmButton}
                />
              </View>
            </>
          )}
        </Card>
      )}

      <Loading visible={completing} message="Completing task..." />
    </ScrollView>
  );
};

const InfoRow: React.FC<{
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}> = ({ icon, label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.textSecondary} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  headerCard: {
    margin: SIZES.paddingLG,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingMD,
  },
  priorityBadge: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderRadius: SIZES.radiusMD,
  },
  priorityText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontSM,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.warning + '20',
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  statusText: {
    color: COLORS.warning,
    fontSize: SIZES.fontSM,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: COLORS.success,
  },
  taskTitle: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  taskDescription: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  infoCard: {
    margin: SIZES.paddingLG,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginLeft: SIZES.paddingSM,
  },
  infoValue: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  notesText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  completeCard: {
    margin: SIZES.paddingLG,
    marginTop: 0,
  },
  formTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
    marginTop: SIZES.paddingMD,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});

export default TaskDetailScreen;
