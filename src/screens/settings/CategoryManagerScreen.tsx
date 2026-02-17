import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, Modal, TextInput, FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { categoryService, Category, CATEGORY_ICONS, CATEGORY_COLORS } from '../../services/category.service';
import { useTheme } from '../../contexts/ThemeContext';
import { GlassHeader } from '../../components/GlassHeader';
import { GlassCard } from '../../components/GlassCard';

export const CategoryManagerScreen = () => {
    const navigation = useNavigation();
    const { theme, isDark } = useTheme();

    const [categories, setCategories] = useState<Category[]>([]);
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState(CATEGORY_ICONS[0]);
    const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);

    useFocusEffect(
        useCallback(() => {
            loadCategories();
        }, [activeTab])
    );

    const loadCategories = async () => {
        const cats = await categoryService.getAll(activeTab);
        setCategories(cats);
    };

    const openAddModal = () => {
        setEditingCategory(null);
        setName('');
        setSelectedIcon(CATEGORY_ICONS[0]);
        setSelectedColor(CATEGORY_COLORS[0]);
        setShowModal(true);
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setName(cat.name);
        setSelectedIcon(cat.icon || CATEGORY_ICONS[0]);
        setSelectedColor(cat.color || CATEGORY_COLORS[0]);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Category name is required');
            return;
        }
        try {
            if (editingCategory) {
                await categoryService.update(editingCategory.id, {
                    name: name.trim(),
                    icon: selectedIcon,
                    color: selectedColor,
                });
                Alert.alert('Updated', `"${name}" updated successfully`);
            } else {
                await categoryService.add({
                    name: name.trim(),
                    type: activeTab,
                    icon: selectedIcon,
                    color: selectedColor,
                });
                Alert.alert('Added', `"${name}" added to ${activeTab} categories`);
            }
            setShowModal(false);
            loadCategories();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleDelete = (cat: Category) => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${cat.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            await categoryService.delete(cat.id);
                            loadCategories();
                        } catch (e: any) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ]
        );
    };

    const renderCategoryItem = (cat: Category) => (
        <TouchableOpacity
            key={cat.id}
            style={[styles.categoryItem, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
            onPress={() => openEditModal(cat)}
            onLongPress={() => handleDelete(cat)}
        >
            <View style={[styles.categoryIconCircle, { backgroundColor: cat.color || CATEGORY_COLORS[0] }]}>
                <Ionicons name={(cat.icon || 'ellipsis-horizontal-outline') as any} size={20} color="#FFF" />
            </View>
            <Text style={[styles.categoryName, { color: theme.colors.text }]}>{cat.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => openEditModal(cat)} style={{ marginRight: 8 }}>
                    <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(cat)}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error || '#FF6B6B'} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={isDark ? ['#1A0033', '#000000'] : ['#E0EAFC', '#CFDEF3']}
                style={StyleSheet.absoluteFill}
            />
            <GlassHeader title="Category Manager" showBack onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Tab Switcher */}
                <View style={styles.tabRow}>
                    {(['expense', 'income'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.tab,
                                activeTab === tab && { backgroundColor: theme.colors.primary },
                                activeTab !== tab && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                            ]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, { color: activeTab === tab ? '#FFF' : theme.colors.text }]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Category List */}
                <GlassCard style={{ padding: 12, borderRadius: 16, marginBottom: 16 }}>
                    {categories.length === 0 ? (
                        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: 20 }}>
                            No {activeTab} categories yet. Tap + to add one.
                        </Text>
                    ) : (
                        categories.map(renderCategoryItem)
                    )}
                </GlassCard>

                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center', marginBottom: 10 }}>
                    Tap to edit • Long-press to delete
                </Text>

                {/* Add Button */}
                <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.primary }]} onPress={openAddModal}>
                    <Ionicons name="add" size={24} color="#FFF" />
                    <Text style={styles.addButtonText}>Add Category</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Add/Edit Modal */}
            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                            {editingCategory ? 'Edit Category' : 'New Category'}
                        </Text>

                        {/* Name Input */}
                        <TextInput
                            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                            placeholder="Category name"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                        />

                        {/* Color Picker */}
                        <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>Color</Text>
                        <View style={styles.colorGrid}>
                            {CATEGORY_COLORS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorSwatch,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.colorSwatchSelected,
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                >
                                    {selectedColor === color && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Icon Picker */}
                        <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>Icon</Text>
                        <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                            <View style={styles.iconGrid}>
                                {CATEGORY_ICONS.map(icon => (
                                    <TouchableOpacity
                                        key={icon}
                                        style={[
                                            styles.iconOption,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                                            selectedIcon === icon && { backgroundColor: selectedColor, borderColor: selectedColor },
                                        ]}
                                        onPress={() => setSelectedIcon(icon)}
                                    >
                                        <Ionicons
                                            name={icon as any}
                                            size={22}
                                            color={selectedIcon === icon ? '#FFF' : theme.colors.text}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Preview */}
                        <View style={[styles.previewRow, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                            <View style={[styles.categoryIconCircle, { backgroundColor: selectedColor }]}>
                                <Ionicons name={selectedIcon as any} size={20} color="#FFF" />
                            </View>
                            <Text style={[styles.previewText, { color: theme.colors.text }]}>{name || 'Preview'}</Text>
                        </View>

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.modalButton, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { flex: 1, backgroundColor: theme.colors.primary }]}
                                onPress={handleSave}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '600' }}>{editingCategory ? 'Update' : 'Add'}</Text>
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
    content: { padding: 16, paddingTop: 110, paddingBottom: 140 },
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    tabText: { fontWeight: '600', fontSize: 14 },
    categoryItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 1, paddingHorizontal: 4,
    },
    categoryIconCircle: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    categoryName: { flex: 1, fontSize: 16, fontWeight: '500' },
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 14, borderRadius: 14, gap: 8,
    },
    addButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 24, borderRadius: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    input: {
        borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 16,
    },
    pickerLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    colorSwatch: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    colorSwatchSelected: { borderWidth: 3, borderColor: '#FFF' },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iconOption: {
        width: 44, height: 44, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    },
    previewRow: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        borderWidth: 1, borderRadius: 12, marginVertical: 16,
    },
    previewText: { fontSize: 16, fontWeight: '500', marginLeft: 12 },
    modalButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
});
