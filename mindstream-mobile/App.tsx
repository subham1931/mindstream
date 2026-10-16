import 'react-native-gesture-handler';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ChatProvider, useChatContext } from './src/context/ChatContext';
import AuthScreen from './src/components/AuthScreen';
import ChatScreen from './src/screens/ChatScreen';
import DrawerContent from './src/screens/DrawerContent';
import { colors } from './src/theme';

const Drawer = createDrawerNavigator();

function AppNavigator() {
  const chat = useChatContext();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    chat.setShowAuth(true);
  };

  return (
    <>
      <Drawer.Navigator
        screenOptions={{
          headerShown: false,
          drawerType: 'front',
          drawerStyle: {
            width: 280,
            backgroundColor: colors.bgPrimary,
          },
          overlayColor: 'rgba(0,0,0,0.55)',
        }}
        drawerContent={(props) => (
          <DrawerContent
            {...props}
            conversations={chat.sidebarConversations}
            activeId={chat.isTempChat ? undefined : chat.activeConversation?.id}
            onSelectChat={chat.handleSelectChat}
            onNewChat={chat.handleNewChat}
            onDeleteChat={chat.handleDeleteChat}
            onPinChat={chat.handlePinChat}
            onShowAuth={openAuth}
            onSignOut={chat.handleSignOut}
          />
        )}
      >
        <Drawer.Screen name="Chat">
          {(props) => <ChatScreen {...props} />}
        </Drawer.Screen>
      </Drawer.Navigator>

      <AuthScreen
        visible={chat.showAuth}
        onClose={() => chat.setShowAuth(false)}
        defaultSignUp={authMode === 'signup'}
      />
    </>
  );
}

function RootContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ChatProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ChatProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootContent />
        </AuthProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
  },
});
