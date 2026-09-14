import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  addCalendarMonths,
  formatCalendarDate,
  formatCalendarMonth,
  formatLongCalendarDate,
  getCalendarMonthDays,
  parseCalendarDate,
} from "@/src/features/operations/presentation/calendarDate";

interface OperationDatePickerProps {
  disabled: boolean;
  invalid: boolean;
  value: string;
  onChange(value: string): void;
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

export const OperationDatePicker = ({
  disabled,
  invalid,
  value,
  onChange,
}: OperationDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(
    () => parseCalendarDate(value) ?? new Date(),
  );
  const selectedDate = parseCalendarDate(value);
  const monthDays = useMemo(
    () => getCalendarMonthDays(displayedMonth),
    [displayedMonth],
  );
  const longDate = formatLongCalendarDate(value);

  const open = () => {
    setDisplayedMonth(selectedDate ?? new Date());
    setIsOpen(true);
  };
  const selectToday = () => {
    const today = new Date();
    onChange(formatCalendarDate(today));
    setDisplayedMonth(today);
    setIsOpen(false);
  };
  const selectDay = (day: number) => {
    onChange(
      formatCalendarDate(
        new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), day),
      ),
    );
    setIsOpen(false);
  };

  return (
    <>
      <View style={styles.fieldRow}>
        <Pressable
          accessibilityLabel={`Date : ${longDate ?? "non renseignée"}. Ouvrir le calendrier`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={open}
          style={[styles.dateField, invalid && styles.invalid]}
        >
          <Text
            style={[styles.dateText, longDate == null && styles.placeholder]}
          >
            {longDate ?? "Choisir une date"}
          </Text>
          <Ionicons
            color={colors.fieldText}
            name="calendar-outline"
            size={22}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={selectToday}
          style={styles.todayButton}
        >
          <Text style={styles.todayLabel}>Aujourd’hui</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <SafeAreaView style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.calendar}>
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityLabel="Mois précédent"
                accessibilityRole="button"
                onPress={() =>
                  setDisplayedMonth((current) => addCalendarMonths(current, -1))
                }
                style={styles.iconButton}
              >
                <Ionicons
                  color={colors.textPrimary}
                  name="chevron-back"
                  size={24}
                />
              </Pressable>
              <Text accessibilityRole="header" style={styles.monthLabel}>
                {formatCalendarMonth(displayedMonth)}
              </Text>
              <Pressable
                accessibilityLabel="Mois suivant"
                accessibilityRole="button"
                onPress={() =>
                  setDisplayedMonth((current) => addCalendarMonths(current, 1))
                }
                style={styles.iconButton}
              >
                <Ionicons
                  color={colors.textPrimary}
                  name="chevron-forward"
                  size={24}
                />
              </Pressable>
            </View>

            <View style={styles.calendarGrid}>
              {WEEKDAYS.map((weekday, index) => (
                <View key={`${weekday}-${index}`} style={styles.dayCell}>
                  <Text style={styles.weekday}>{weekday}</Text>
                </View>
              ))}
              {monthDays.map((day, index) => {
                if (day == null) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }
                const isSelected =
                  selectedDate?.getFullYear() ===
                    displayedMonth.getFullYear() &&
                  selectedDate.getMonth() === displayedMonth.getMonth() &&
                  selectedDate.getDate() === day;
                return (
                  <View key={day} style={styles.dayCell}>
                    <Pressable
                      accessibilityLabel={`${day} ${formatCalendarMonth(displayedMonth)}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => selectDay(day)}
                      style={[
                        styles.dayButton,
                        isSelected && styles.selectedDay,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayLabel,
                          isSelected && styles.selectedDayLabel,
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.calendarActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={styles.actionButton}
              >
                <Text style={styles.actionLabel}>Annuler</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={selectToday}
                style={[styles.actionButton, styles.todayCalendarButton]}
              >
                <Text style={styles.todayCalendarLabel}>Aujourd’hui</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fieldRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: primitives.space["2"],
  },
  dateField: {
    alignItems: "center",
    backgroundColor: colors.fieldBackground,
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    flex: 1,
    flexDirection: "row",
    gap: primitives.space["2"],
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  invalid: {
    borderColor: colors.statusErrorText,
    borderWidth: semantic.borderWidth.focus,
  },
  dateText: {
    color: colors.fieldText,
    flex: 1,
    fontSize: primitives.fontSize.md,
  },
  placeholder: { color: colors.textSecondary },
  todayButton: {
    alignItems: "center",
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: semantic.radius.control,
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: primitives.space["3"],
  },
  todayLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: primitives.shadow.md.color,
    flex: 1,
    justifyContent: "center",
    padding: primitives.space["4"],
  },
  calendar: {
    backgroundColor: colors.backgroundSurface,
    borderRadius: semantic.radius.card,
    maxWidth: primitives.size.contentSm,
    padding: primitives.space["4"],
    width: "100%",
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    height: semantic.size.controlMinHeight,
    justifyContent: "center",
    width: semantic.size.controlMinHeight,
  },
  monthLabel: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
    textTransform: "capitalize",
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: "14.285714%",
  },
  weekday: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  dayButton: {
    alignItems: "center",
    borderRadius: primitives.radius.pill,
    height: "84%",
    justifyContent: "center",
    width: "84%",
  },
  selectedDay: { backgroundColor: colors.actionPrimaryBackground },
  dayLabel: { color: colors.textPrimary, fontSize: primitives.fontSize.md },
  selectedDayLabel: { color: colors.actionPrimaryText, fontWeight: semibold },
  calendarActions: {
    flexDirection: "row",
    gap: primitives.space["2"],
    justifyContent: "flex-end",
    marginTop: primitives.space["3"],
  },
  actionButton: {
    alignItems: "center",
    borderRadius: semantic.radius.control,
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  actionLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  todayCalendarButton: { backgroundColor: colors.actionPrimaryBackground },
  todayCalendarLabel: {
    color: colors.actionPrimaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
});
