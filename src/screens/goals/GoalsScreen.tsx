import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../contexts/ThemeContext';
import { goalService, Goal } from '../../services/goal.service';
import { settingsService } from '../../services/settings.service';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';
import { GlassInput } from '../../components/GlassInput';

export const GoalsScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showFundModal, setShowFundModal] = useState(false);

    // Form State
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [savedAmount, setSavedAmount] = useState(''); // For initial creation if needed, though usually 0
    const [deadline, setDeadline] = useState<Date | null>(null);
    const [selectedIcon, setSelectedIcon] = useState('trophy-outline');
    const [selectedColor, setSelectedColor] = useState('#4CAF50');

    // Fund Modal State
    const [fundGoalId, setFundGoalId] = useState<string | null>(null);
    const [fundAmount, setFundAmount] = useState('');

    const [currency, setCurrency] = useState('₹');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await goalService.getGoals();
            const profile = await settingsService.getProfileSettings();
            setCurrency(profile.currency);
            setGoals(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveGoal = async () => {
        if (!name || !targetAmount) {
            Alert.alert('Error', 'Please fill required fields');
            return;
        }

        try {
            const target = parseFloat(targetAmount);
            if (isNaN(target) || target <= 0) {
                Alert.alert('Error', 'Invalid target amount');
                return;
            }

            if (editingGoal) {
                await goalService.updateGoal({
                    ...editingGoal,
                    name,
                    target_amount: target,
                    deadline: deadline ? deadline.getTime() : undefined,
                    icon: selectedIcon,
                    color: selectedColor
                });
            } else {
                await goalService.addGoal({
                    name,
                    target_amount: target,
                    icon: selectedIcon,
                    color: selectedColor,
                    deadline: deadline ? deadline.getTime() : undefined
                });
            }
            setShowAddModal(false);
            resetForm();
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to save goal');
        }
    };

    const handleDeleteGoal = async (id: string) => {
        Alert.alert('Delete Goal', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await goalService.deleteGoal(id);
                    loadData();
                }
            }
        ]);
    };

    const handleAddFunds = async () => {
        if (!fundGoalId || !fundAmount) return;
        const amount = parseFloat(fundAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Error', 'Invalid amount');
            return;
        }

        try {
            await goalService.addFunds(fundGoalId, amount);
            setShowFundModal(false);
            setFundAmount('');
            setFundGoalId(null);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to add funds');
        }
    };

    const resetForm = () => {
        setEditingGoal(null);
        setName('');
        setTargetAmount('');
        setDeadline(null);
        setSelectedIcon('trophy-outline');
        setSelectedColor('#4CAF50');
    };

    const calculateProgress = (saved: number, target: number) => {
        if (target === 0) return 0;
        return Math.min(1, saved / target);
    };

    const openEditModal = (goal: Goal) => {
        setEditingGoal(goal);
        setName(goal.name);
        setTargetAmount(goal.target_amount.toString());
        setDeadline(goal.deadline ? new Date(goal.deadline) : null);
        setSelectedIcon(goal.icon || 'trophy-outline');
        setSelectedColor(goal.color || '#4CAF50');
        setShowAddModal(true);
    };

    const renderGoalCard = (goal: Goal) => {
        const progress = calculateProgress(goal.saved_amount, goal.target_amount);
        const isCompleted = goal.status === 'completed';

        return (
            <GlassCard key={goal.id} style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: goal.color || theme.colors.primary }]}>
                    <Ionicons name={goal.icon as any} size={24} color="#FFF" />
                </View>

                <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.goalName, { color: theme.colors.text }]}>{goal.name}</Text>
                        <TouchableOpacity onPress={() => openEditModal(goal)}>
                            <Ionicons name="pencil" size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
                        {currency}{goal.saved_amount.toLocaleString()} / {currency}{goal.target_amount.toLocaleString()}
                    </Text>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: goal.color || theme.colors.success }]} />
                    </View>

                    {goal.deadline && (
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                            <Ionicons name="calendar-outline" size={12} /> Target: {new Date(goal.deadline).toLocaleDateString()}
                        </Text>
                    )}

                    <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' }}>
                        {!isCompleted && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => { setFundGoalId(goal.id); setShowFundModal(true); }}
                            >
                                <Ionicons name="add" size={16} color="#FFF" />
                                <Text style={styles.actionButtonText}>Add Funds</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.colors.error, marginLeft: 8 }]}
                            onPress={() => handleDeleteGoal(goal.id)}
                        >
                            <Ionicons name="trash-outline" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </GlassCard>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />
            <GlassHeader title="Financial Goals" showBack onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.content}>
                {goals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="trophy-outline" size={64} color={theme.colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            Set goals to track your savings journey.
                        </Text>
                    </View>
                ) : (
                    goals.map(renderGoalCard)
                )}
            </ScrollView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => { resetForm(); setShowAddModal(true); }}
            >
                <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>

            {/* Add/Edit Modal */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                            {editingGoal ? 'Edit Goal' : 'New Goal'}
                        </Text>

                        <GlassInput
                            placeholder="Goal Name (e.g. New Laptop)"
                            value={name}
                            onChangeText={setName}
                        />

                        <GlassInput
                            placeholder="Target Amount"
                            value={targetAmount}
                            onChangeText={setTargetAmount}
                            keyboardType="numeric"
                        />

                        {/* Color Picker (Simplified) */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 }}>
                            {['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'].map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedColor === color ? 2 : 0 }]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.card, flex: 1, marginRight: 8 }]}
                                onPress={() => setShowAddModal(false)}
                            >
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.primary, flex: 1, marginLeft: 8 }]}
                                onPress={handleSaveGoal}
                            >
                                <Text style={{ color: '#FFF' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>
            </Modal>

            {/* Add Funds Modal */}
            <Modal visible={showFundModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={[styles.modalContent, { width: '80%' }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Funds</Text>
                        <GlassInput
                            placeholder="Amount to add"
                            value={fundAmount}
                            onChangeText={setFundAmount}
                            keyboardType="numeric"
                            autoFocus
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.card, flex: 1, marginRight: 8 }]}
                                onPress={() => { setShowFundModal(false); setFundAmount(''); }}
                            >
                                <Text style={{ color: theme.colors.text }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: theme.colors.primary, flex: 1, marginLeft: 8 }]}
                                onPress={handleAddFunds}
                            >
                                <Text style={{ color: '#FFF' }}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingTop: 110, paddingBottom: 100 },
    card: { flexDirection: 'row', padding: 16, marginBottom: 16, borderRadius: 16, alignItems: 'center' },
    iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    goalName: { fontSize: 18, fontWeight: 'bold' },
    progressBarContainer: { height: 8, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    actionButton: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center' },
    actionButtonText: { color: '#FFF', fontSize: 12, marginLeft: 4, fontWeight: '600' },
    fab: {
        position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8
    },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 24, borderRadius: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
    colorCircle: { width: 40, height: 40, borderRadius: 20, borderColor: '#FFF' }
});
