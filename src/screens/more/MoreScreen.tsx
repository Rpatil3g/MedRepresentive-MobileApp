import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Avatar } from '../../components/common';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, SIZES } from '../../constants';
import { MoreStackParamList } from '../../types/navigation.types';

type MoreNavProp = StackNavigationProp<MoreStackParamList>;

const MoreScreen: React.FC = () => {
  const navigation = useNavigation<MoreNavProp>();
  const { user } = useAppSelector((state) => state.auth);
  const { mrProfile } = useAppSelector((state) => state.user);
  const { logout } = useAuth();

  const MenuItem: React.FC<{
    icon: string;
    title: string;
    onPress: () => void;
    showChevron?: boolean;
    iconColor?: string;
  }> = ({ icon, title, onPress, showChevron = true, iconColor = COLORS.primary }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      {showChevron && (
        <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar
            name={user?.fullName || 'User'}
            imageUrl={user?.profileImageUrl}
            size={60}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            {mrProfile && (
              <Text style={styles.profileId}>ID: {mrProfile.employeeId}</Text>
            )}
          </View>
        </View>
      </Card>

      {/* Tasks Section */}
      <Text style={styles.sectionTitle}>Tasks</Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon="clipboard-list"
          title="All Tasks"
          onPress={() => navigation.navigate('TaskList')}
        />
        <MenuItem
          icon="alert-circle"
          title="Overdue Tasks"
          onPress={() => navigation.navigate('TaskList')}
        />
      </Card>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>Account</Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon="lock"
          title="Change Password"
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <MenuItem
          icon="map-marker"
          title="My Territories"
          onPress={() => {}}
        />
      </Card>

      {/* Reports Section */}
      <Text style={styles.sectionTitle}>Reports</Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon="chart-line"
          title="My Performance"
          onPress={() => {}}
        />
        <MenuItem
          icon="calendar-month"
          title="Monthly Report"
          onPress={() => {}}
        />
      </Card>

      {/* Settings Section */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <Card style={styles.menuCard}>
        <MenuItem
          icon="bell"
          title="Notifications"
          onPress={() => {}}
        />
        <MenuItem
          icon="help-circle"
          title="Help & Support"
          onPress={() => {}}
        />
        <MenuItem
          icon="information"
          title="About"
          onPress={() => {}}
        />
      </Card>

      {/* Logout */}
      <Card style={styles.logoutCard}>
        <MenuItem
          icon="logout"
          title="Logout"
          onPress={handleLogout}
          showChevron={false}
          iconColor={COLORS.error}
        />
      </Card>

      {/* App Version */}
      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  profileCard: {
    margin: SIZES.paddingLG,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: SIZES.paddingMD,
  },
  profileName: {
    fontSize: SIZES.fontXL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileId: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: SIZES.paddingLG,
    marginTop: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
  },
  menuCard: {
    marginHorizontal: SIZES.paddingLG,
    marginBottom: SIZES.paddingMD,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    marginLeft: SIZES.paddingMD,
  },
  logoutCard: {
    marginHorizontal: SIZES.paddingLG,
    marginBottom: SIZES.paddingLG,
    padding: 0,
  },
  versionText: {
    textAlign: 'center',
    fontSize: SIZES.fontSM,
    color: COLORS.textDisabled,
    marginBottom: SIZES.paddingXL,
  },
});

export default MoreScreen;
