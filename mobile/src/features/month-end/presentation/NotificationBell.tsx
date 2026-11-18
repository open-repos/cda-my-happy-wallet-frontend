import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  AttentionItem,
  bellLabel,
} from "@/src/features/month-end/domain/pendingItems";
import {
  monthEndColors as colors,
  monthEndStyles as styles,
} from "@/src/features/month-end/presentation/monthEndStyles";
import { vaultStyles as shared } from "@/src/features/vault/presentation/vaultStyles";

/**
 * Cloche de l'en-tête de l'Accueil (#425, maquette validée) : feuille
 * « À traiter » avec la décision en attente ou à revoir et les versements à
 * confirmer. Aucune API dédiée, ni push, ni état « lu » (#414). Une lecture
 * en échec est signalée dans la feuille seulement.
 */
export const NotificationBell = ({
  items,
  incomplete,
  onRetry,
}: {
  items: AttentionItem[];
  /** Une des lectures a échoué : la liste peut être incomplète. */
  incomplete: boolean;
  onRetry(): void;
}) => {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const go = (item: AttentionItem) => {
    setOpen(false);
    if (item.kind === "occurrence") router.push("/(app)/vault");
    else {
      router.push({
        pathname: "/(app)/month-end",
        params: { mois: item.month },
      });
    }
  };
  return (
    <>
      <Pressable
        accessibilityLabel={bellLabel(items.length)}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.iconButton, pressed && shared.pressed]}
        testID="notification-bell"
      >
        <Ionicons
          color={colors.textPrimary}
          name={items.length > 0 ? "notifications" : "notifications-outline"}
          size={24}
        />
        {items.length > 0 ? (
          <View aria-hidden style={styles.badge}>
            <Text style={styles.badgeText}>{items.length}</Text>
          </View>
        ) : null}
      </Pressable>
      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}
      >
        {/* Une Modal Android a besoin de son propre fournisseur de marges. */}
        <SafeAreaProvider>
          <SafeAreaView edges={["bottom"]} style={styles.sheetLayer}>
            <View
              accessibilityViewIsModal
              style={[styles.sheet, { maxHeight: height * 0.85 }]}
              testID="attention-sheet"
            >
              <View style={shared.row}>
                <View style={shared.movementCopy}>
                  <Text accessibilityRole="header" style={shared.cardTitle}>
                    À traiter
                  </Text>
                  <Text style={shared.help}>
                    Calculé depuis vos données. Une entrée disparaît dès que
                    l’action est faite.
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Fermer « À traiter »"
                  accessibilityRole="button"
                  onPress={() => setOpen(false)}
                  style={styles.iconButton}
                >
                  <Ionicons color={colors.textPrimary} name="close" size={28} />
                </Pressable>
              </View>
              {/* Liste bornée : l'en-tête et « Fermer » restent visibles. */}
              <ScrollView
                contentContainerStyle={styles.sheetList}
                style={styles.sheetScroll}
                testID="attention-list"
              >
                {items.map((item) => (
                  <Pressable
                    key={
                      item.kind === "occurrence"
                        ? `${item.occurrence.accountId}:${item.occurrence.month}`
                        : item.kind
                    }
                    accessibilityHint={item.text}
                    accessibilityLabel={item.title}
                    accessibilityRole="button"
                    onPress={() => go(item)}
                    style={({ pressed }) => [
                      styles.choice,
                      pressed && shared.pressed,
                    ]}
                  >
                    <Text style={styles.label}>{item.title}</Text>
                    <Text style={shared.help}>{item.text}</Text>
                  </Pressable>
                ))}
                {items.length === 0 && !incomplete ? (
                  <Text style={shared.text}>
                    Rien à traiter pour le moment.
                  </Text>
                ) : null}
                {incomplete ? (
                  <View style={shared.row}>
                    <Text style={[shared.help, styles.reminderText]}>
                      Certains éléments n’ont pas pu être vérifiés.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={onRetry}
                      style={({ pressed }) => [
                        shared.link,
                        pressed && shared.pressed,
                      ]}
                    >
                      <Text style={shared.linkLabel}>Réessayer</Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
};
