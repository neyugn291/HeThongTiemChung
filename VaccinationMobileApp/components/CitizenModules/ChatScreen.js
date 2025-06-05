import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  scrollToEnd
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApis, endpoints } from "../../configs/Apis";

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]); // Tin nhắn trong phiên hiện tại
  const [inputText, setInputText] = useState("");
  const [showPrompts, setShowPrompts] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const sendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText) return;

    try {
      const token = await AsyncStorage.getItem("token");

      setShowPrompts(false);
      setInputText("");
      setIsTyping(true);

      // Thêm tin nhắn user ngay lập tức
      const userMessage = {
        id: `user-${Date.now()}`,
        text: trimmedText,
        is_user: true,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      scrollToBottom();

      // Gọi API để lấy phản hồi từ AI
      const response = await authApis(token).post(endpoints["aiChat"], {
        message: trimmedText,
      });

      let aiMessage;

      // Xử lý phản hồi từ API
      if (response.status === 200) {
        if (response.data.success) {
          const { user_message, ai_response, suggestions, navigation } = response.data;
          
          // Cập nhật tin nhắn với dữ liệu từ server
          aiMessage = {
            id: `ai-${Date.now()}`,
            text: ai_response,
            suggestions: suggestions || [],
            navigation: navigation || null,
            is_user: false,
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prevMessages => {
            const filteredMessages = prevMessages.filter(msg => msg.id !== userMessage.id);
            return [
              ...filteredMessages,
              { ...userMessage, text: user_message }, // Cập nhật user_message
              aiMessage,
            ];
          });
        } else if (response.data.suggestions) {
          // Hiển thị gợi ý nếu có
          aiMessage = {
            id: `ai-${Date.now()}`,
            text: response.data.message,
            suggestions: response.data.suggestions,
            navigation: response.data.navigation || null,
            is_user: false,
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prevMessages => [...prevMessages, aiMessage]);
        } else {
          // Hiển thị lỗi từ backend
          aiMessage = {
            id: `ai-${Date.now()}`,
            text: response.data.detail || "Có lỗi xảy ra, vui lòng thử lại sau!",
            navigation: response.data.navigation || null,
            is_user: false,
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prevMessages => [...prevMessages, aiMessage]);
        }
      } else {
        throw new Error("Phản hồi API không thành công.");
      }

    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      
      // Thêm tin nhắn lỗi từ AI
      const aiMessage = {
        id: `ai-${Date.now()}`,
        text: error.response?.data?.detail || "Có lỗi xảy ra, vui lòng thử lại sau!",
        is_user: false,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const handlePromptPress = (promptText) => {
    setInputText(promptText);
    setShowPrompts(false);
  };

  const handleSuggestionPress = (suggestion) => {
    setInputText(suggestion);
    sendMessage();
  };

  const handleNavigationPress = (screen) => {
    if (screen) {
      navigation.navigate(screen);
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.is_user ? styles.userMessage : styles.aiMessage,
      ]}
    >
      <Text style={[
        styles.messageText,
        item.is_user ? styles.userMessageText : styles.aiMessageText
      ]}>
        {item.text}
      </Text>
      
      {/* Hiển thị nút chuyển hướng nếu có navigation */}
      {item.navigation && (
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => handleNavigationPress(item.navigation)}
        >
          <Text style={styles.navigationButtonText}>Chuyển đến {item.navigation}</Text>
        </TouchableOpacity>
      )}
      
      {/* Hiển thị gợi ý nếu có */}
      {item.suggestions && item.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Gợi ý:</Text>
          {item.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <Text style={[
        styles.timestamp,
        item.is_user ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {new Date(item.timestamp).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chat với AI</Text>
          <Text style={styles.headerSubtitle}>Chuyên gia vắc-xin & sức khỏe</Text>
        </View>
        
        <View style={styles.refreshButtonPlaceholder} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
          </View>
          <Text style={styles.typingText}>AI đang trả lời...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Nhập câu hỏi về vắc-xin, sức khỏe..."
          multiline
          maxLength={500}
          editable={!isTyping}
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          style={[
            styles.sendButton,
            (!inputText.trim() || isTyping) && styles.sendButtonDisabled
          ]}
          disabled={!inputText.trim() || isTyping}
        >
          {isTyping ? (
            <ActivityIndicator size={20} color="#0c5776" />
          ) : (
            <MaterialCommunityIcons name="send" size={24} color="#0c5776" />
          )}
        </TouchableOpacity>
      </View>

      {showPrompts && (
        <View style={styles.promptSuggestions}>
          <Text style={styles.sectionTitle}>💡 Gợi ý câu hỏi</Text>
          
          <TouchableOpacity 
            style={styles.promptItem}
            onPress={() => handlePromptPress("Lịch tiêm chủng cho trẻ em từ 0-18 tháng như thế nào?")}
          >
            <Text style={styles.promptText}>🍼 Lịch tiêm chủng cho trẻ em từ 0-18 tháng như thế nào?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.promptItem}
            onPress={() => handlePromptPress("Những loại vaccine nào phù hợp cho người lớn tuổi?")}
          >
            <Text style={styles.promptText}>👵 Những loại vaccine nào phù hợp cho người lớn tuổi?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.promptItem}
            onPress={() => handlePromptPress("Cách chăm sóc và theo dõi sau khi tiêm vaccine?")}
          >
            <Text style={styles.promptText}>🏥 Cách chăm sóc và theo dõi sau khi tiêm vaccine?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.promptItem}
            onPress={() => handlePromptPress("Tác dụng phụ của vaccine có nguy hiểm không?")}
          >
            <Text style={styles.promptText}>⚠️ Tác dụng phụ của vaccine có nguy hiểm không?</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    height: 120,
    backgroundColor: "#0c5776",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    alignItems: "center",
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 2,
  },
  refreshButtonPlaceholder: {
    width: 40,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 18,
    marginVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  userMessage: {
    backgroundColor: "#0c5776",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#fff",
  },
  aiMessageText: {
    color: "#333",
  },
  navigationButton: {
    marginTop: 10,
    backgroundColor: "#0c5776",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navigationButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  userTimestamp: {
    color: "#fff",
    textAlign: "right",
  },
  aiTimestamp: {
    color: "#666",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0c5776",
    marginHorizontal: 2,
    opacity: 0.4,
  },
  typingText: {
    color: "#666",
    fontStyle: "italic",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  input: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  sendButton: {
    padding: 10,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  promptSuggestions: {
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e8ed",
  },
  sectionTitle: {
    fontSize: 16,
    color: "#0c5776",
    fontWeight: "600",
    marginBottom: 15,
  },
  promptItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  promptText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 14,
    color: "#0c5776",
    fontWeight: "500",
    marginBottom: 5,
  },
  suggestionItem: {
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#e1e8ed",
  },
  suggestionText: {
    fontSize: 14,
    color: "#333",
  },
});

export default ChatScreen;