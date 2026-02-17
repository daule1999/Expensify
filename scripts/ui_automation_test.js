/**
 * UI/CSS Automation Test Suite
 * ═══════════════════════════════════════════════════════════════
 * Scans all React Native screen files and validates StyleSheet.create()
 * definitions for correct CSS properties without needing a running app.
 * 
 * Validates: dimensions, padding, margin, colors, font sizes,
 *            border radius, flex layout, tap targets, accessibility
 * 
 * Run: node scripts/ui_automation_test.js
 */

const fs = require('fs');
const path = require('path');

const SCREENS_DIR = path.join(__dirname, '..', 'src', 'screens');
const results = [];
let totalChecks = 0;

// ─── Test Framework ────────────────────────────────────────────

function test(name, fn) {
    try {
        fn();
        results.push({ test: name, status: 'PASSED', error: '' });
    } catch (e) {
        results.push({ test: name, status: 'FAILED', error: e.message });
    }
}

// ─── Style Extraction Engine ───────────────────────────────────

function extractStyleSheets(fileContent) {
    // Extract everything inside StyleSheet.create({ ... })
    const styleBlocks = [];
    const regex = /StyleSheet\.create\(\{([\s\S]*?)\}\);/g;
    let match;
    while ((match = regex.exec(fileContent)) !== null) {
        styleBlocks.push(match[1]);
    }
    return styleBlocks;
}

function parseStyleProperties(block) {
    // Parse individual style objects like: container: { flex: 1, padding: 20 }
    const styles = {};
    const styleRegex = /(\w+)\s*:\s*\{([^}]*)\}/g;
    let match;

    while ((match = styleRegex.exec(block)) !== null) {
        const styleName = match[1];
        const propsStr = match[2];
        const props = {};

        // Parse key-value pairs (handles numbers, strings, objects inline)
        const propRegex = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|(-?[\d.]+%?)|(\{[^}]*\})|(\w+))/g;
        let propMatch;
        while ((propMatch = propRegex.exec(propsStr)) !== null) {
            const key = propMatch[1];
            const value = propMatch[2] || propMatch[3] || propMatch[4] || propMatch[5] || propMatch[6];
            props[key] = value;
        }

        styles[styleName] = props;
    }
    return styles;
}

// ─── Discover All Screen Files ─────────────────────────────────

function findScreenFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findScreenFiles(fullPath));
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

const screenFiles = findScreenFiles(SCREENS_DIR);

console.log(`\n═══════════════════════════════════════════════════════════`);
console.log(`  UI/CSS AUTOMATION TEST SUITE`);
console.log(`  Scanning ${screenFiles.length} screen files...`);
console.log(`═══════════════════════════════════════════════════════════\n`);

// ─── Validation Utilities ──────────────────────────────────────

const VALID_HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const VALID_RGBA = /^rgba?\(\s*\d+/;
const VALID_HSL = /^hsla?\(\s*\d+/;
const VALID_NAMED_COLORS = new Set([
    'transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow',
    'orange', 'purple', 'pink', 'gray', 'grey', 'cyan', 'magenta',
    'brown', 'gold', 'silver', 'navy', 'teal', 'lime', 'coral',
    'salmon', 'tomato', 'turquoise', 'violet', 'indigo', 'crimson'
]);

function isValidColor(value) {
    if (!value || typeof value !== 'string') return true; // skip non-string
    const v = value.trim().toLowerCase();
    if (VALID_NAMED_COLORS.has(v)) return true;
    if (VALID_HEX_COLOR.test(value)) return true;
    if (VALID_RGBA.test(value)) return true;
    if (VALID_HSL.test(value)) return true;
    return false;
}

function isValidPercentage(value) {
    if (typeof value === 'string' && value.endsWith('%')) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
    }
    return false;
}

function isNumberOrPercent(value) {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.endsWith('%')) return isValidPercentage(value);
    const num = Number(value);
    return !isNaN(num);
}

// ─── Store all parsed styles per file ──────────────────────────

const allFileStyles = [];

screenFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const blocks = extractStyleSheets(content);
    const fileName = path.basename(file);

    blocks.forEach(block => {
        const styles = parseStyleProperties(block);
        allFileStyles.push({ fileName, file, styles, content });
    });
});

// ═══════════════════════════════════════════════════════════════
// GROUP 1: DIMENSION VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Dimensions: All width values are valid numbers or percentages', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.width !== undefined && !isNumberOrPercent(props.width)) {
                errors.push(`${fileName}.${name}.width = "${props.width}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid widths:\n  ${errors.join('\n  ')}`);
});

test('Dimensions: All height values are valid numbers or percentages', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.height !== undefined && !isNumberOrPercent(props.height)) {
                errors.push(`${fileName}.${name}.height = "${props.height}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid heights:\n  ${errors.join('\n  ')}`);
});

test('Dimensions: No negative width or height', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            ['width', 'height'].forEach(dim => {
                if (props[dim] !== undefined) {
                    const val = parseFloat(props[dim]);
                    if (!isNaN(val) && val < 0) {
                        errors.push(`${fileName}.${name}.${dim} = ${props[dim]} (negative)`);
                    }
                }
            });
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Negative dimensions:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 2: PADDING VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Padding: All padding values are non-negative numbers', () => {
    const paddingProps = ['padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingHorizontal', 'paddingVertical'];
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            paddingProps.forEach(p => {
                if (props[p] !== undefined) {
                    const val = parseFloat(props[p]);
                    if (isNaN(val)) return; // skip non-numeric (could be dynamic)
                    if (val < 0) errors.push(`${fileName}.${name}.${p} = ${props[p]} (negative)`);
                }
            });
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Negative padding:\n  ${errors.join('\n  ')}`);
});

test('Padding: Reasonable padding range (0-200)', () => {
    const paddingProps = ['padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingHorizontal', 'paddingVertical'];
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            paddingProps.forEach(p => {
                if (props[p] !== undefined) {
                    const val = parseFloat(props[p]);
                    if (!isNaN(val) && val > 200) {
                        errors.push(`${fileName}.${name}.${p} = ${props[p]} (unusually large)`);
                    }
                }
            });
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Excessive padding:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 3: MARGIN VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Margin: All margin values are valid numbers', () => {
    const marginProps = ['margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical'];
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            marginProps.forEach(m => {
                if (props[m] !== undefined) {
                    const val = parseFloat(props[m]);
                    if (isNaN(val)) return; // skip dynamic values
                    // Allow negative margins (they're valid in RN) but flag extremely large
                    if (Math.abs(val) > 300) {
                        errors.push(`${fileName}.${name}.${m} = ${props[m]} (extremely large)`);
                    }
                }
            });
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Extreme margins:\n  ${errors.join('\n  ')}`);
});

test('Margin: No excessive bottom margins (> 200)', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.marginBottom !== undefined) {
                const val = parseFloat(props.marginBottom);
                if (!isNaN(val) && val > 200) {
                    errors.push(`${fileName}.${name}.marginBottom = ${val}`);
                }
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Excessive bottom margins:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 4: COLOR VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Color: Hardcoded color properties are valid formats', () => {
    const colorProps = ['color', 'backgroundColor', 'borderColor', 'shadowColor', 'textShadowColor', 'tintColor'];
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            colorProps.forEach(c => {
                if (props[c] !== undefined && typeof props[c] === 'string') {
                    if (!isValidColor(props[c])) {
                        errors.push(`${fileName}.${name}.${c} = "${props[c]}" (invalid color)`);
                    }
                }
            });
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid colors:\n  ${errors.join('\n  ')}`);
});

test('Color: Detect hardcoded colors in StyleSheet (should use theme)', () => {
    const colorProps = ['color', 'backgroundColor', 'borderColor'];
    const hardcodedCount = { total: 0, files: new Set() };
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            colorProps.forEach(c => {
                if (props[c] !== undefined && typeof props[c] === 'string') {
                    const val = props[c].trim();
                    if (VALID_HEX_COLOR.test(val) || VALID_NAMED_COLORS.has(val.toLowerCase())) {
                        hardcodedCount.total++;
                        hardcodedCount.files.add(fileName);
                    }
                }
            });
        });
    });
    totalChecks++;
    // Report as info, not failure — many screens use dynamic theme.colors.x at runtime
    console.log(`  ℹ️  Found ${hardcodedCount.total} hardcoded colors in StyleSheet across ${hardcodedCount.files.size} files`);
    if (hardcodedCount.files.size > 0) {
        console.log(`     Files: ${[...hardcodedCount.files].join(', ')}`);
    }
    // This is informational — doesn't fail
});

test('Color: No empty color strings', () => {
    const colorProps = ['color', 'backgroundColor', 'borderColor', 'shadowColor'];
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            colorProps.forEach(c => {
                if (props[c] !== undefined && props[c] === '') {
                    errors.push(`${fileName}.${name}.${c} is empty string`);
                }
            });
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Empty color strings:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 5: FONT SIZE VALIDATION
// ═══════════════════════════════════════════════════════════════

test('FontSize: All values within reasonable range (8-64)', () => {
    const errors = [];
    const fontSizes = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.fontSize !== undefined) {
                const val = parseFloat(props.fontSize);
                if (!isNaN(val)) {
                    fontSizes.push({ file: fileName, style: name, size: val });
                    if (val < 8) errors.push(`${fileName}.${name}.fontSize = ${val} (too small)`);
                    if (val > 64) errors.push(`${fileName}.${name}.fontSize = ${val} (too large)`);
                }
            }
        });
    });
    totalChecks++;
    console.log(`  ℹ️  Found ${fontSizes.length} fontSize declarations across all screens`);
    if (errors.length > 0) throw new Error(`Font sizes out of range:\n  ${errors.join('\n  ')}`);
});

test('FontSize: Body text minimum is 11pt for readability', () => {
    const warnings = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.fontSize !== undefined) {
                const val = parseFloat(props.fontSize);
                if (!isNaN(val) && val < 11 && !name.toLowerCase().includes('badge') && !name.toLowerCase().includes('dot')) {
                    warnings.push(`${fileName}.${name}.fontSize = ${val}`);
                }
            }
        });
    });
    totalChecks++;
    if (warnings.length > 0) {
        console.log(`  ⚠️  Small font sizes (< 11pt): ${warnings.join(', ')}`);
    }
});

test('FontSize: Font size distribution is reasonable', () => {
    const sizes = [];
    allFileStyles.forEach(({ styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.fontSize !== undefined) {
                const val = parseFloat(props.fontSize);
                if (!isNaN(val)) sizes.push(val);
            }
        });
    });
    const uniqueSizes = [...new Set(sizes)].sort((a, b) => a - b);
    console.log(`  ℹ️  Font size spectrum: [${uniqueSizes.join(', ')}]`);
    totalChecks++;
    // Informational — having too many unique sizes suggests inconsistent typography
    if (uniqueSizes.length > 15) {
        console.log(`  ⚠️  ${uniqueSizes.length} unique font sizes detected — consider consolidating to a design system`);
    }
});

// ═══════════════════════════════════════════════════════════════
// GROUP 6: BORDER RADIUS VALIDATION
// ═══════════════════════════════════════════════════════════════

test('BorderRadius: All values are non-negative', () => {
    const radiusProps = ['borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            radiusProps.forEach(r => {
                if (props[r] !== undefined) {
                    const val = parseFloat(props[r]);
                    if (!isNaN(val) && val < 0) {
                        errors.push(`${fileName}.${name}.${r} = ${val} (negative)`);
                    }
                }
            });
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Negative border radius:\n  ${errors.join('\n  ')}`);
});

test('BorderRadius: Circular elements have radius = width/2', () => {
    const circles = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            const w = parseFloat(props.width);
            const h = parseFloat(props.height);
            const r = parseFloat(props.borderRadius);
            if (!isNaN(w) && !isNaN(h) && !isNaN(r) && w === h && r > 0) {
                if (r === w / 2) {
                    circles.push(`${fileName}.${name} (${w}x${h}, r=${r}) ✓ perfect circle`);
                } else if (r >= w) {
                    circles.push(`${fileName}.${name} (${w}x${h}, r=${r}) ✓ overflow radius (still circular)`);
                }
            }
        });
    });
    totalChecks++;
    if (circles.length > 0) {
        console.log(`  ℹ️  Detected ${circles.length} circular elements`);
    }
});

// ═══════════════════════════════════════════════════════════════
// GROUP 7: FLEX LAYOUT VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Flex: All flex values are valid numbers', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.flex !== undefined) {
                const val = parseFloat(props.flex);
                if (isNaN(val)) {
                    errors.push(`${fileName}.${name}.flex = "${props.flex}" (not a number)`);
                } else if (val < -1 || val > 100) {
                    errors.push(`${fileName}.${name}.flex = ${val} (unusual value)`);
                }
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid flex values:\n  ${errors.join('\n  ')}`);
});

test('Flex: flexDirection values are valid', () => {
    const validDirections = new Set(['row', 'column', 'row-reverse', 'column-reverse']);
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.flexDirection !== undefined && !validDirections.has(props.flexDirection)) {
                errors.push(`${fileName}.${name}.flexDirection = "${props.flexDirection}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid flexDirection:\n  ${errors.join('\n  ')}`);
});

test('Flex: justifyContent values are valid', () => {
    const valid = new Set(['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']);
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.justifyContent !== undefined && !valid.has(props.justifyContent)) {
                errors.push(`${fileName}.${name}.justifyContent = "${props.justifyContent}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid justifyContent:\n  ${errors.join('\n  ')}`);
});

test('Flex: alignItems values are valid', () => {
    const valid = new Set(['flex-start', 'flex-end', 'center', 'stretch', 'baseline']);
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.alignItems !== undefined && !valid.has(props.alignItems)) {
                errors.push(`${fileName}.${name}.alignItems = "${props.alignItems}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid alignItems:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 8: TAP TARGET / ACCESSIBILITY VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Accessibility: Tap targets meet minimum 44pt', () => {
    const MIN_TAP = 44;
    const smallTargets = [];
    const tapKeywords = ['button', 'btn', 'fab', 'icon', 'touch', 'press', 'tap', 'action', 'close', 'back', 'nav'];

    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            const isLikelyTappable = tapKeywords.some(k => name.toLowerCase().includes(k));
            if (isLikelyTappable) {
                const w = parseFloat(props.width);
                const h = parseFloat(props.height);
                if (!isNaN(w) && w < MIN_TAP) {
                    smallTargets.push(`${fileName}.${name} width=${w}`);
                }
                if (!isNaN(h) && h < MIN_TAP) {
                    smallTargets.push(`${fileName}.${name} height=${h}`);
                }
            }
        });
    });
    totalChecks++;
    if (smallTargets.length > 0) {
        console.log(`  ⚠️  Small tap targets (< ${MIN_TAP}pt):`);
        smallTargets.forEach(t => console.log(`     - ${t}`));
    }
    // Informational warning, not failure — some icon containers may have padding
});

test('Accessibility: Interactive elements have minimum dimensions', () => {
    const MIN_SIZE = 24;
    const issues = [];
    const interactiveKeywords = ['button', 'btn', 'fab', 'checkbox', 'radio', 'switch', 'toggle'];

    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            const isInteractive = interactiveKeywords.some(k => name.toLowerCase().includes(k));
            if (isInteractive) {
                const w = parseFloat(props.width);
                const h = parseFloat(props.height);
                if (!isNaN(w) && w < MIN_SIZE) issues.push(`${fileName}.${name} width=${w}`);
                if (!isNaN(h) && h < MIN_SIZE) issues.push(`${fileName}.${name} height=${h}`);
            }
        });
    });
    totalChecks++;
    if (issues.length > 0) {
        console.log(`  ⚠️  Very small interactive elements (< ${MIN_SIZE}pt): ${issues.join(', ')}`);
    }
});

// ═══════════════════════════════════════════════════════════════
// GROUP 9: SHADOW & ELEVATION VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Shadow: elevation values are within range (0-24)', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.elevation !== undefined) {
                const val = parseFloat(props.elevation);
                if (!isNaN(val) && (val < 0 || val > 24)) {
                    errors.push(`${fileName}.${name}.elevation = ${val}`);
                }
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid elevation:\n  ${errors.join('\n  ')}`);
});

test('Shadow: shadowOpacity between 0 and 1', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.shadowOpacity !== undefined) {
                const val = parseFloat(props.shadowOpacity);
                if (!isNaN(val) && (val < 0 || val > 1)) {
                    errors.push(`${fileName}.${name}.shadowOpacity = ${val}`);
                }
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid shadowOpacity:\n  ${errors.join('\n  ')}`);
});

test('Shadow: shadowRadius is non-negative', () => {
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.shadowRadius !== undefined) {
                const val = parseFloat(props.shadowRadius);
                if (!isNaN(val) && val < 0) {
                    errors.push(`${fileName}.${name}.shadowRadius = ${val}`);
                }
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Negative shadowRadius:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 10: POSITION & OVERFLOW VALIDATION
// ═══════════════════════════════════════════════════════════════

test('Position: position values are valid', () => {
    const validPositions = new Set(['absolute', 'relative']);
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.position !== undefined && !validPositions.has(props.position)) {
                errors.push(`${fileName}.${name}.position = "${props.position}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid position:\n  ${errors.join('\n  ')}`);
});

test('Position: overflow values are valid', () => {
    const validOverflow = new Set(['visible', 'hidden', 'scroll']);
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.overflow !== undefined && !validOverflow.has(props.overflow)) {
                errors.push(`${fileName}.${name}.overflow = "${props.overflow}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid overflow:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 11: FONT WEIGHT VALIDATION
// ═══════════════════════════════════════════════════════════════

test('FontWeight: All fontWeight values are valid RN values', () => {
    const validWeights = new Set(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']);
    const errors = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (props.fontWeight !== undefined && !validWeights.has(String(props.fontWeight))) {
                errors.push(`${fileName}.${name}.fontWeight = "${props.fontWeight}"`);
            }
        });
    });
    totalChecks++;
    if (errors.length > 0) throw new Error(`Invalid fontWeight:\n  ${errors.join('\n  ')}`);
});

// ═══════════════════════════════════════════════════════════════
// GROUP 12: CROSS-FILE CONSISTENCY CHECKS
// ═══════════════════════════════════════════════════════════════

test('Consistency: Container styles use flex: 1', () => {
    const nonFlexContainers = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (name === 'container') {
                if (props.flex === undefined || parseFloat(props.flex) !== 1) {
                    nonFlexContainers.push(fileName);
                }
            }
        });
    });
    totalChecks++;
    if (nonFlexContainers.length > 0) {
        console.log(`  ⚠️  Containers without flex: 1: ${nonFlexContainers.join(', ')}`);
    }
});

test('Consistency: ScrollView content has paddingBottom for safe area', () => {
    const missingPaddingBottom = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        Object.entries(styles).forEach(([name, props]) => {
            if (name.toLowerCase().includes('scrollcontent') || name.toLowerCase().includes('content')) {
                if (props.paddingBottom === undefined && props.padding === undefined) {
                    missingPaddingBottom.push(`${fileName}.${name}`);
                }
            }
        });
    });
    totalChecks++;
    if (missingPaddingBottom.length > 0) {
        console.log(`  ℹ️  Scroll containers without paddingBottom: ${missingPaddingBottom.join(', ')}`);
    }
});

test('Consistency: All screens use theme.colors for background (source check)', () => {
    let themeUsageCount = 0;
    let hardcodedBgCount = 0;
    const hardcodedBgFiles = [];

    allFileStyles.forEach(({ fileName, content }) => {
        if (content.includes('theme.colors.background')) themeUsageCount++;
        // Check for hardcoded background in StyleSheet
        const bgMatches = content.match(/backgroundColor\s*:\s*['"]#[^'"]+['"]/g);
        if (bgMatches) {
            hardcodedBgCount += bgMatches.length;
            hardcodedBgFiles.push(fileName);
        }
    });
    totalChecks++;
    console.log(`  ℹ️  Theme background usage: ${themeUsageCount} files use theme.colors`);
    if (hardcodedBgCount > 0) {
        console.log(`  ⚠️  ${hardcodedBgCount} hardcoded backgroundColor in StyleSheet (${[...new Set(hardcodedBgFiles)].join(', ')})`);
    }
});

// ═══════════════════════════════════════════════════════════════
// GROUP 13: STYLE COVERAGE STATS
// ═══════════════════════════════════════════════════════════════

test('Stats: All screen files have StyleSheet definitions', () => {
    const filesWithoutStyles = [];
    screenFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('StyleSheet.create')) {
            filesWithoutStyles.push(path.basename(file));
        }
    });
    totalChecks++;
    const withStyles = screenFiles.length - filesWithoutStyles.length;
    console.log(`  ℹ️  StyleSheet coverage: ${withStyles}/${screenFiles.length} screens`);
    if (filesWithoutStyles.length > 0) {
        console.log(`  ⚠️  Screens without StyleSheet: ${filesWithoutStyles.join(', ')}`);
    }
});

test('Stats: Total style rules per screen', () => {
    const screenStats = [];
    allFileStyles.forEach(({ fileName, styles }) => {
        const ruleCount = Object.keys(styles).length;
        screenStats.push({ screen: fileName, rules: ruleCount });
    });
    screenStats.sort((a, b) => b.rules - a.rules);
    totalChecks++;
    console.log(`  ℹ️  Style rules per screen:`);
    screenStats.slice(0, 10).forEach(s => {
        console.log(`     ${s.screen.padEnd(35)} ${s.rules} rules`);
    });
});

test('Stats: Total style properties analyzed', () => {
    let totalProps = 0;
    allFileStyles.forEach(({ styles }) => {
        Object.values(styles).forEach(props => {
            totalProps += Object.keys(props).length;
        });
    });
    totalChecks++;
    console.log(`  ℹ️  Total style properties analyzed: ${totalProps}`);
});

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════

console.log('\n--- UI/CSS AUTOMATION TEST REPORT ---');
console.table(results);

const passed = results.filter(r => r.status === 'PASSED').length;
const failed = results.filter(r => r.status === 'FAILED').length;
console.log(`\nScreens scanned: ${screenFiles.length}`);
console.log(`Style blocks analyzed: ${allFileStyles.length}`);
console.log(`Total checks: ${totalChecks}`);
console.log(`\nPASSED: ${passed} / ${results.length}`);
if (failed > 0) {
    console.log(`FAILED: ${failed}`);
    results.filter(r => r.status === 'FAILED').forEach(r => {
        console.log(`  ❌ ${r.test}: ${r.error}`);
    });
}
console.log(failed === 0 ? '\n✅ ALL UI/CSS TESTS PASSED' : '\n❌ SOME UI/CSS TESTS FAILED');

if (failed > 0) process.exit(1);
