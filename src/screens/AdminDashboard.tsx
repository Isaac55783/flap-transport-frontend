import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';

import {
  Button,
  Text,
  Card,
  Avatar,
  IconButton,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { apiService } from '../services/api';
import { brandColors } from '../theme';

export default function AdminDashboard({ navigation }: any) {
  const theme = useTheme();

  // ============================================================
  // KPI STATS
  // ============================================================

  const [stats, setStats] = useState<any>({
    total_passengers: 0,
    total_drivers: 0,
    online_drivers: 0,
    active_trips: 0,
    pending_verifications: 0,
    total_reports: 0,
    total_routes: 0,
    total_stations: 0,
  });

  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // ============================================================
  // BROADCASTER
  // ============================================================

  const [announcementTitle, setAnnouncementTitle] =
    useState('');

  const [announcementMsg, setAnnouncementMessage] =
    useState('');

  const [loading, setLoading] = useState(false);

  const [selectedTab, setSelectedTab] = useState<
    'stats' | 'drivers' | 'reports' | 'users'
  >('stats');

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);

    try {
      // Dashboard statistics
      const dashboardStats =
        await apiService.getAdminStats();

      setStats(dashboardStats);

      // Pending drivers
      const pDrivers =
        await apiService.getPendingDrivers();

      setPendingDrivers(pDrivers);

      // Reports
      const activeReports =
        await apiService.getReports();

      setReports(activeReports);

      // --------------------------------------------------------
      // USERS
      // --------------------------------------------------------
      //
      // Your current apiService does NOT contain getUsers().
      //
      // We therefore do not call apiService.getUsers()
      // here because that causes the TypeScript error.
      //
      // We will connect this section to your real backend
      // user endpoint after checking your api.ts file.
      //
      setUsers([]);
    } catch (err) {
      console.log(
        'Error pulling admin data:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // VERIFY DRIVER
  // ============================================================

  const handleVerifyDriver = async (
    driverId: number,
    status: 'verified' | 'rejected'
  ) => {
    try {
      await apiService.verifyDriver(
        driverId,
        status
      );

      alert(
        `Driver profile registration ${status} successfully.`
      );

      fetchAdminData();
    } catch (err) {
      console.log(err);
    }
  };

  // ============================================================
  // BAN / UNBAN USER
  // ============================================================

  const handleBanUser = async (
    userId: number,
    status: 'active' | 'banned'
  ) => {
    try {
      await apiService.banUser(
        userId,
        status
      );

      alert(
        `User account has been successfully set to: ${status}`
      );

      fetchAdminData();
    } catch (err) {
      console.log(err);
    }
  };

  // ============================================================
  // SEND BROADCAST
  // ============================================================

  const handleSendBroadcast = async () => {
    if (
      !announcementTitle.trim() ||
      !announcementMsg.trim()
    ) {
      alert(
        'Title and Message bodies cannot be empty.'
      );

      return;
    }

    try {
      await apiService.broadcastAnnouncement(
        announcementTitle,
        announcementMsg
      );

      setAnnouncementTitle('');
      setAnnouncementMessage('');

      alert(
        'Announcement successfully dispatched to all registered Flap Transport users.'
      );

      fetchAdminData();
    } catch (err) {
      console.log(err);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>

      {/* ======================================================
          ADMIN HEADER
      ======================================================= */}

      <View
        style={[
          styles.header,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Text
            variant="headlineSmall"
            style={styles.appLogo}
          >
            Flap Admin Center
          </Text>

          <IconButton
            icon="logout"
            iconColor={brandColors.emergency}
            onPress={() =>
              navigation.replace('Welcome')
            }
          />
        </View>

        <Text variant="bodySmall">
          Super Admin Panel • System Diagnostics Mode
        </Text>
      </View>

      {/* ======================================================
          TABS
      ======================================================= */}

      <View style={styles.tabsRow}>

        <Button
          mode={
            selectedTab === 'stats'
              ? 'contained'
              : 'text'
          }
          onPress={() =>
            setSelectedTab('stats')
          }
          textColor={
            selectedTab === 'stats'
              ? undefined
              : brandColors.greenDark
          }
          style={styles.tabBtn}
        >
          Metrics
        </Button>

        <Button
          mode={
            selectedTab === 'drivers'
              ? 'contained'
              : 'text'
          }
          onPress={() =>
            setSelectedTab('drivers')
          }
          textColor={
            selectedTab === 'drivers'
              ? undefined
              : brandColors.greenDark
          }
          style={styles.tabBtn}
        >
          Approvals ({pendingDrivers.length})
        </Button>

        <Button
          mode={
            selectedTab === 'reports'
              ? 'contained'
              : 'text'
          }
          onPress={() =>
            setSelectedTab('reports')
          }
          textColor={
            selectedTab === 'reports'
              ? undefined
              : brandColors.greenDark
          }
          style={styles.tabBtn}
        >
          Road Issues ({reports.length})
        </Button>

        <Button
          mode={
            selectedTab === 'users'
              ? 'contained'
              : 'text'
          }
          onPress={() =>
            setSelectedTab('users')
          }
          textColor={
            selectedTab === 'users'
              ? undefined
              : brandColors.greenDark
          }
          style={styles.tabBtn}
        >
          Users
        </Button>

      </View>

      {/* ======================================================
          BODY
      ======================================================= */}

      <ScrollView
        style={styles.body}
        contentContainerStyle={
          styles.bodyContent
        }
      >

        {/* ====================================================
            STATS
        ===================================================== */}

        {selectedTab === 'stats' && (
          <View>

            {/* ROW 1 */}

            <View style={styles.gridRow}>

              <Card style={styles.gridCard}>
                <Card.Content
                  style={styles.centered}
                >

                  <Avatar.Icon
  size={36}
  icon="walk"
  style={{ backgroundColor: brandColors.green }}
/>

                  <Text
                    variant="titleMedium"
                    style={styles.cardVal}
                  >
                    {stats.total_passengers}
                  </Text>

                  <Text
                    variant="labelSmall"
                    style={styles.cardLabel}
                  >
                    Passengers
                  </Text>

                </Card.Content>
              </Card>

              <Card style={styles.gridCard}>
                <Card.Content
                  style={styles.centered}
                >

                  <Avatar.Icon
                    size={36}
                    icon="steering"
                    style={{
                      backgroundColor:
                        brandColors.green,
                    }}
                  />

                  <Text
                    variant="titleMedium"
                    style={styles.cardVal}
                  >
                    {stats.total_drivers}
                  </Text>

                  <Text
                    variant="labelSmall"
                    style={styles.cardLabel}
                  >
                    Total Drivers
                  </Text>

                </Card.Content>
              </Card>

            </View>

            {/* ROW 2 */}

            <View style={styles.gridRow}>

              <Card style={styles.gridCard}>
                <Card.Content
                  style={styles.centered}
                >

                  <Avatar.Icon
                    size={36}
                    icon="bus"
                    style={{
                      backgroundColor:
                        brandColors.warning,
                    }}
                  />

                  <Text
                    variant="titleMedium"
                    style={styles.cardVal}
                  >
                    {stats.online_drivers}
                  </Text>

                  <Text
                    variant="labelSmall"
                    style={styles.cardLabel}
                  >
                    Online Drivers
                  </Text>

                </Card.Content>
              </Card>

              <Card style={styles.gridCard}>
                <Card.Content
                  style={styles.centered}
                >

                  <Avatar.Icon
                    size={36}
                    icon="routes"
                    style={{
                      backgroundColor:
                        brandColors.greenDark,
                    }}
                  />

                  <Text
                    variant="titleMedium"
                    style={styles.cardVal}
                  >
                    {stats.total_routes}
                  </Text>

                  <Text
                    variant="labelSmall"
                    style={styles.cardLabel}
                  >
                    Active Routes
                  </Text>

                </Card.Content>
              </Card>

            </View>

            {/* =================================================
                BROADCAST
            ================================================== */}

            <Card style={styles.broadcastCard}>

              <Card.Content>

                <Text
                  variant="titleMedium"
                  style={styles.sectionTitle}
                >
                  Broadcast System Announcement
                </Text>

                <Text
                  variant="bodySmall"
                  style={styles.subtext}
                >
                  This triggers a push notifications
                  update to all drivers and passengers
                  in Ghana.
                </Text>

                <TextInput
                  mode="outlined"
                  label="Announcement Title"
                  value={announcementTitle}
                  onChangeText={
                    setAnnouncementTitle
                  }
                  style={styles.input}
                />

                <TextInput
                  mode="outlined"
                  label="Message Content"
                  multiline
                  numberOfLines={3}
                  value={announcementMsg}
                  onChangeText={
                    setAnnouncementMessage
                  }
                  style={styles.input}
                />

                <Button
                  mode="contained"
                  onPress={
                    handleSendBroadcast
                  }
                  style={styles.broadcastBtn}
                  icon="bullhorn"
                >
                  Send Announcement
                </Button>

              </Card.Content>

            </Card>

          </View>
        )}

        {/* ====================================================
            DRIVERS
        ===================================================== */}

        {selectedTab === 'drivers' && (
          <View>

            <Text
              variant="titleLarge"
              style={styles.sectionTitle}
            >
              Pending Driver Verifications
            </Text>

            {pendingDrivers.length === 0 ? (
              <Text style={styles.emptyText}>
                All submitted drivers are verified.
              </Text>
            ) : (
              pendingDrivers.map((item) => (
                <Card
                  key={item.user_id}
                  style={styles.listItemCard}
                >
                  <Card.Content>

                    <View
                      style={styles.driverMeta}
                    >

                      <Text
                        variant="titleMedium"
                        style={styles.driverName}
                      >
                        {item.name}
                      </Text>

                      <Text variant="bodySmall">
                        Phone: {item.phone_number}
                      </Text>

                      <Text variant="bodySmall">
                        License Code:{' '}
                        {item.license_number}
                      </Text>

                      {item.vehicle && (
                        <Text variant="bodySmall">
                          Vehicle:{' '}
                          {item.vehicle.color}{' '}
                          {item.vehicle.model}{' '}
                          (
                          {item.vehicle.plate_number}
                          )
                        </Text>
                      )}

                    </View>

                    <View
                      style={
                        styles.approvalButtons
                      }
                    >

                      <Button
                        mode="contained"
                        buttonColor={
                          brandColors.emergency
                        }
                        onPress={() =>
                          handleVerifyDriver(
                            item.user_id,
                            'rejected'
                          )
                        }
                        style={styles.apprBtn}
                      >
                        Reject
                      </Button>

                      <Button
                        mode="contained"
                        buttonColor={
                          brandColors.green
                        }
                        onPress={() =>
                          handleVerifyDriver(
                            item.user_id,
                            'verified'
                          )
                        }
                        style={styles.apprBtn}
                      >
                        Approve
                      </Button>

                    </View>

                  </Card.Content>
                </Card>
              ))
            )}

          </View>
        )}

        {/* ====================================================
            REPORTS
        ===================================================== */}

        {selectedTab === 'reports' && (
          <View>

            <Text
              variant="titleLarge"
              style={styles.sectionTitle}
            >
              Incident and Obstacle Logs
            </Text>

            {reports.length === 0 ? (
              <Text style={styles.emptyText}>
                No active hazards or alerts reported
                on Accra roads.
              </Text>
            ) : (
              reports.map((item) => (
                <Card
                  key={item.id}
                  style={styles.listItemCard}
                >
                  <Card.Content>

                    <View
                      style={styles.reportRow}
                    >

                      <Avatar.Icon
                        size={28}
                        icon={
                          item.type === 'police'
                            ? 'shield-car'
                            : 'alert-octagon'
                        }
                        style={{
                          backgroundColor:
                            brandColors.warning,
                        }}
                      />

                      <View
                        style={styles.reportMeta}
                      >

                        <Text
                          variant="titleMedium"
                          style={styles.reportType}
                        >
                          {String(
                            item.type || 'unknown'
                          ).toUpperCase()}
                        </Text>

                        <Text variant="bodySmall">
                          Logged by:{' '}
                          {item.reporter_name}
                        </Text>

                        <Text variant="bodyMedium">
                          {item.description ||
                            'No descriptive comments added.'}
                        </Text>

                      </View>

                    </View>

                  </Card.Content>
                </Card>
              ))
            )}

          </View>
        )}

        {/* ====================================================
            USERS
        ===================================================== */}

        {selectedTab === 'users' && (
          <View>

            <Text
              variant="titleLarge"
              style={styles.sectionTitle}
            >
              Passenger and Driver Registries
            </Text>

            {users.length === 0 ? (
              <Text style={styles.emptyText}>
                User registry is not connected yet.
              </Text>
            ) : (
              users.map((item) => (
                <Card
                  key={item.id}
                  style={styles.listItemCard}
                >
                  <Card.Content>

                    <View
                      style={styles.userRow}
                    >

                      <View
                        style={styles.userMeta}
                      >

                        <Text
                          variant="titleMedium"
                          style={styles.userName}
                        >
                          {item.name}
                        </Text>

                        <Text variant="bodySmall">
                          Phone:{' '}
                          {item.phone_number}
                          {' • '}
                          Role:{' '}
                          {String(
                            item.role || ''
                          ).toUpperCase()}
                        </Text>

                        <Text
                          variant="bodySmall"
                          style={
                            item.status === 'banned'
                              ? {
                                  color:
                                    brandColors.emergency,
                                }
                              : {
                                  color:
                                    brandColors.greenDark,
                                }
                          }
                        >
                          Status:{' '}
                          {String(
                            item.status || ''
                          ).toUpperCase()}
                        </Text>

                      </View>

                      {item.status === 'active' ? (
                        <Button
                          mode="contained"
                          buttonColor={
                            brandColors.emergency
                          }
                          onPress={() =>
                            handleBanUser(
                              item.id,
                              'banned'
                            )
                          }
                          style={styles.banBtn}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          mode="contained"
                          buttonColor={
                            brandColors.green
                          }
                          onPress={() =>
                            handleBanUser(
                              item.id,
                              'active'
                            )
                          }
                          style={styles.banBtn}
                        >
                          Un-Suspend
                        </Button>
                      )}

                    </View>

                  </Card.Content>
                </Card>
              ))
            )}

          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  header: {
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  appLogo: {
    fontWeight: 'bold',
    color: brandColors.green,
  },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    elevation: 2,
  },

  tabBtn: {
    flex: 1,
    marginHorizontal: 2,
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
  },

  bodyContent: {
    paddingVertical: 16,
    paddingBottom: 40,
  },

  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  gridCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardVal: {
    fontWeight: 'bold',
    fontSize: 20,
    marginVertical: 4,
  },

  cardLabel: {
    color: '#757575',
  },

  broadcastCard: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },

  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },

  subtext: {
    color: '#757575',
    marginBottom: 12,
  },

  input: {
    marginBottom: 10,
  },

  broadcastBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: brandColors.green,
  },

  listItemCard: {
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  driverMeta: {
    marginBottom: 12,
  },

  driverName: {
    fontWeight: 'bold',
  },

  approvalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  apprBtn: {
    marginLeft: 8,
    borderRadius: 8,
  },

  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  reportMeta: {
    marginLeft: 12,
    flex: 1,
  },

  reportType: {
    fontWeight: 'bold',
    color: brandColors.greenDark,
  },

  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  userMeta: {
    flex: 1,
  },

  userName: {
    fontWeight: 'bold',
  },

  banBtn: {
    borderRadius: 8,
  },

  emptyText: {
    textAlign: 'center',
    color: '#757575',
    marginVertical: 30,
  },
});