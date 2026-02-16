import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Slide {
    id: string;
    title: string;
    description: string;
    icon: string;
    colors: [string, string];
}

const slides: Slide[] = [
    {
        id: '1',
        title: 'Smart SMS Parsing',
        description: 'Automatically track your expenses from bank SMS alerts with on-device AI.',
        icon: 'chatbubble-ellipses-outline',
        colors: ['#4FACFE', '#00F2FE'],
    },
    {
        id: '2',
        title: 'Privacy First',
        description: 'Your financial data stays local. We use AES-256 encryption and biometrics.',
        icon: 'shield-checkmark-outline',
        colors: ['#43E97B', '#38F9D7'],
    },
    {
        id: '3',
        title: 'Budget Planning',
        description: 'Set monthly limits and get alerts before you overspend.',
        icon: 'pie-chart-outline',
        colors: ['#FA709A', '#FEE140'],
    },
    {
        id: '4',
        title: 'Bill Reminders',
        description: 'Never miss an EMI or subscription renewal with smart notifications.',
        icon: 'notifications-outline',
        colors: ['#667EEA', '#764BA2'],
    },
];

export const OnboardingScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        setCurrentIndex(viewableItems[0]?.index || 0);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const handleNext = async () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            await AsyncStorage.setItem('has_onboarded', 'true');
            navigation.navigate('MainTabs' as never);
        }
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem('has_onboarded', 'true');
        navigation.navigate('MainTabs' as never);
    };

    const renderItem = ({ item }: { item: Slide }) => {
        return (
            <View style={styles.slide}>
                <LinearGradient
                    colors={item.colors}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name={item.icon as any} size={80} color="#FFF" />
                </LinearGradient>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
                    <Text style={[styles.description, { color: theme.colors.textSecondary }]}>{item.description}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#FDFCFB', '#E2D1C3']}
                style={StyleSheet.absoluteFill}
            />

            <View style={{ flex: 3 }}>
                <FlatList
                    data={slides}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />
            </View>

            <View style={styles.footer}>
                {/* Paginator */}
                <View style={styles.paginator}>
                    {slides.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 20, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return (
                            <Animated.View
                                key={i.toString()}
                                style={[
                                    styles.dot,
                                    { width: dotWidth, opacity, backgroundColor: theme.colors.primary },
                                ]}
                            />
                        );
                    })}
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Skip</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleNext}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <Ionicons
                            name={currentIndex === slides.length - 1 ? 'checkmark' : 'arrow-forward'}
                            size={20}
                            color="#FFF"
                            style={{ marginLeft: 8 }}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    iconContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    footer: {
        height: 150,
        justifyContent: 'space-between',
        paddingHorizontal: 40,
        width,
    },
    paginator: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    nextButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
