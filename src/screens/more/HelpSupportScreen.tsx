import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../../components/common';
import { COLORS, SIZES } from '../../constants';

const SUPPORT_EMAIL = 'contact@eterniro.com';

const faqs = [
  {
    question: 'How do I punch in for attendance?',
    answer:
      'On the Home screen, tap "Punch In" on the attendance card at the top — your GPS location is recorded automatically. You need to be punched in to log visits.',
  },
  {
    question: 'Where can I see my attendance history?',
    answer:
      'Open Profile → My Attendance. It shows each month as a calendar (present, half day, absent, leave, holidays) — tap any day to see your punch-in and punch-out times.',
  },
  {
    question: 'How do I log a doctor visit?',
    answer:
      'From the Home screen tap "Log Visit", select the doctor, then check in. After your meeting, open the visit and tap "Check Out".',
  },
  {
    question: 'What is a DCR?',
    answer:
      'A Daily Call Report (DCR) summarises your field activity for a day — visits made, samples distributed, and doctors met. Submit it before midnight each day.',
  },
  {
    question: 'How do I add a Monthly Tour Plan?',
    answer:
      'Navigate to Tour Plan from the bottom tab, tap a date on the calendar, fill in the route and planned visits, then save.',
  },
  {
    question: 'My location is not updating — what should I do?',
    answer:
      'Make sure location permission is set to "Always Allow" in your device settings for EterniRo Field Force, and that you are punched in.',
  },
];

const HelpSupportScreen: React.FC = () => {
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const openEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=EterniRo Field Force Support`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Contact Card */}
      <Card style={styles.contactCard}>
        <View style={styles.contactHeader}>
          <View style={styles.contactIconWrap}>
            <MaterialCommunityIcons name="headset" size={28} color={COLORS.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactSubtitle}>We typically respond within 24 hours</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.emailButton} onPress={openEmail} activeOpacity={0.8}>
          <MaterialCommunityIcons name="email-outline" size={18} color={COLORS.primary} />
          <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
        </TouchableOpacity>
      </Card>

      {/* FAQ Section */}
      <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

      {faqs.map((faq, index) => {
        const isOpen = expanded === index;
        return (
          <Card key={index} style={styles.faqCard}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => setExpanded(isOpen ? null : index)}
              activeOpacity={0.7}
            >
              <Text style={styles.questionText}>{faq.question}</Text>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {isOpen && (
              <View style={styles.faqAnswer}>
                <Text style={styles.answerText}>{faq.answer}</Text>
              </View>
            )}
          </Card>
        );
      })}

      <Text style={styles.footer}>
        Can't find what you need? Email us and we'll help you out.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingLG,
    paddingBottom: SIZES.paddingXL,
  },
  contactCard: {
    marginBottom: SIZES.paddingLG,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  contactIconWrap: {
    width: 52,
    height: 52,
    borderRadius: SIZES.radiusLG,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingMD,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  contactSubtitle: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM + 2,
    borderRadius: SIZES.radiusMD,
    gap: 8,
  },
  emailText: {
    fontSize: SIZES.fontMD,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingMD,
  },
  faqCard: {
    marginBottom: SIZES.paddingSM,
    padding: 0,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
  },
  questionText: {
    flex: 1,
    fontSize: SIZES.fontMD,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginRight: SIZES.paddingSM,
  },
  faqAnswer: {
    paddingHorizontal: SIZES.paddingMD,
    paddingBottom: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  answerText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: SIZES.paddingSM,
  },
  footer: {
    marginTop: SIZES.paddingLG,
    fontSize: SIZES.fontSM,
    color: COLORS.textDisabled,
    textAlign: 'center',
  },
});

export default HelpSupportScreen;
