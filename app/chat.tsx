import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  Message,
} from "@/services/messageService";

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles(colors, isDark);
  const { user } = useAuth();
  const { conversationId, institutionName, appointmentDate } =
    useLocalSearchParams<{
      conversationId: string;
      institutionName: string;
      appointmentDate: string;
    }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) return;

      try {
        const { data, error } = await getMessages(conversationId);
        if (error) {
          Alert.alert("Error", "Could not load messages. Please try again.");
        } else if (data) {
          setMessages(data);
          scrollToBottom();
        }
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const subscription = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!user?.id || !conversationId || !messageText.trim()) return;

    setSending(true);
    try {
      const { error } = await sendMessage(
        conversationId,
        user.id,
        messageText.trim()
      );
      if (error) {
        Alert.alert("Error", "Could not send message. Please try again.");
      } else {
        setMessageText("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerTitle: institutionName,
          headerBackTitle: "Back",
        }}
      />

      {/* Header with appointment info */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>{institutionName}</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Appointment: {appointmentDate}
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Messages List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={64}
                  color={colors.iconMuted}
                />
                <ThemedText style={styles.emptyText}>
                  No messages yet
                </ThemedText>
                <ThemedText style={styles.emptySubtext}>
                  Send a message to start the conversation
                </ThemedText>
              </View>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageWrapper,
                      isOwnMessage
                        ? styles.ownMessageWrapper
                        : styles.otherMessageWrapper,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isOwnMessage
                          ? styles.ownMessageBubble
                          : styles.otherMessageBubble,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.messageText,
                          isOwnMessage
                            ? styles.ownMessageText
                            : styles.otherMessageText,
                        ]}
                      >
                        {message.message}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.messageTime,
                          isOwnMessage
                            ? styles.ownMessageTime
                            : styles.otherMessageTime,
                        ]}
                      >
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </ThemedText>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = (colors: any, isDark: boolean) =>
  useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          padding: 16,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        },
        headerTitle: {
          fontSize: 18,
          fontWeight: "bold",
          color: colors.textPrimary,
          marginBottom: 4,
        },
        headerSubtitle: {
          fontSize: 14,
          color: colors.textSecondary,
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        messagesContainer: {
          flex: 1,
        },
        messagesContent: {
          padding: 16,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 60,
        },
        emptyText: {
          fontSize: 18,
          fontWeight: "bold",
          color: colors.textPrimary,
          marginTop: 16,
          marginBottom: 8,
        },
        emptySubtext: {
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: "center",
        },
        messageWrapper: {
          marginBottom: 12,
        },
        ownMessageWrapper: {
          alignItems: "flex-end",
        },
        otherMessageWrapper: {
          alignItems: "flex-start",
        },
        messageBubble: {
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 20,
          maxWidth: "80%",
        },
        ownMessageBubble: {
          backgroundColor: colors.primary,
          borderBottomRightRadius: 4,
        },
        otherMessageBubble: {
          backgroundColor: colors.card,
          borderBottomLeftRadius: 4,
          borderWidth: 1,
          borderColor: colors.borderLight,
        },
        messageText: {
          fontSize: 16,
          lineHeight: 22,
        },
        ownMessageText: {
          color: "#FFFFFF",
        },
        otherMessageText: {
          color: colors.textPrimary,
        },
        messageTime: {
          fontSize: 11,
          marginTop: 4,
          textAlign: "right",
        },
        ownMessageTime: {
          color: "rgba(255, 255, 255, 0.7)",
        },
        otherMessageTime: {
          color: colors.textSecondary,
        },
        inputContainer: {
          flexDirection: "row",
          padding: 12,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          alignItems: "flex-end",
          gap: 12,
        },
        input: {
          flex: 1,
          backgroundColor: colors.background,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: 16,
          color: colors.textPrimary,
          maxHeight: 100,
          borderWidth: 1,
          borderColor: colors.borderLight,
        },
        sendButton: {
          backgroundColor: colors.primary,
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: "center",
          alignItems: "center",
        },
        sendButtonDisabled: {
          backgroundColor: colors.iconMuted,
        },
      }),
    [colors, isDark]
  );
