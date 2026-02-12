const { physicsClasses } = require("./physicsClasses");

/**
 * Parse a physics word problem into structured simulation data.
 *
 * Strategy:
 *  1. Keyword-match the problem text against all 8 physics classes.
 *  2. Score each class by number of keyword hits.
 *  3. Pick the highest-scoring class (ties broken by declaration order).
 *  4. Extract numeric values from the text and map them to parameters.
 *  5. Merge extracted values with class defaults.
 */

// Common regex patterns for extracting numeric values with units
const extractionPatterns = [
    // SHM specific
    { regex: /k\s*=\s*(\d+\.?\d*)/gi, param: "spring_constant" },
    { regex: /A\s*=\s*(\d+\.?\d*)/gi, param: "amplitude" },
    { regex: /m\s*=\s*(\d+\.?\d*)/gi, param: "mass" },
    // Pulley / Atwood (m1, m2)
    { regex: /m[_]?1\s*=\s*(\d+\.?\d*)/gi, param: "mass1" },
    { regex: /m[_]?2\s*=\s*(\d+\.?\d*)/gi, param: "mass2" },
    // General
    { regex: /(\d+\.?\d*)\s*°|(\d+\.?\d*)\s*degree/gi, param: "angle" },
    { regex: /velocity\s*(?:of\s*)?(\d+\.?\d*)\s*m\/s/gi, param: "initial_velocity" },
    { regex: /speed\s*(?:of\s*)?(\d+\.?\d*)\s*m\/s/gi, param: "initial_velocity" },
    { regex: /(\d+\.?\d*)\s*m\/s/gi, param: "velocity_raw" },
    { regex: /height\s*(?:of\s*)?(\d+\.?\d*)\s*m/gi, param: "initial_height" },
    { regex: /(\d+\.?\d*)\s*m(?:eter)?s?\s*(?:tall|high|above)/gi, param: "initial_height" },
    { regex: /mass\s*(?:of\s*)?(\d+\.?\d*)\s*kg/gi, param: "mass" },
    { regex: /(\d+\.?\d*)\s*kg/gi, param: "mass" },
    { regex: /gravity\s*(?:of\s*|=\s*)?(\d+\.?\d*)/gi, param: "gravity" },
    { regex: /g\s*=\s*(\d+\.?\d*)/gi, param: "gravity" },
    { regex: /force\s*(?:of\s*)?(\d+\.?\d*)\s*N/gi, param: "applied_force" },
    { regex: /(\d+\.?\d*)\s*N(?:ewton)?/gi, param: "applied_force" },
    { regex: /radius\s*(?:of\s*)?(\d+\.?\d*)\s*m/gi, param: "radius" },
    { regex: /frequency\s*(?:of\s*)?(\d+\.?\d*)\s*Hz/gi, param: "frequency" },
    { regex: /(\d+\.?\d*)\s*Hz/gi, param: "frequency" },
    { regex: /wavelength\s*(?:of\s*)?(\d+\.?\d*)\s*m/gi, param: "wavelength" },
    { regex: /amplitude\s*(?:of\s*)?(\d+\.?\d*)\s*m/gi, param: "amplitude" },
    { regex: /friction\s*(?:coefficient\s*)?(?:of\s*|=\s*)?(\d+\.?\d*)/gi, param: "friction" },
    { regex: /spring\s*constant\s*(?:of\s*|=\s*)?(\d+\.?\d*)/gi, param: "spring_constant" },
    { regex: /density\s*(?:of\s*)?(\d+\.?\d*)/gi, param: "fluid_density" },
    { regex: /rpm\s*(?:of\s*)?(\d+\.?\d*)/gi, param: "angular_velocity_rpm" },
];

/**
 * Classify the problem by scoring keyword matches.
 */
function classifyProblem(text) {
    const lower = text.toLowerCase();

    // 1. STRICT OVERRIDES
    // SHM: if 'k=' and 'm=' are detected, it is strictly SHM.
    const hasK = /k\s*=\s*\d+/.test(lower) || /spring constant/i.test(lower);
    const hasM = /m\s*=\s*\d+/.test(lower) || /mass/i.test(lower);
    const hasOscillation = /oscillat|spring|harmonic/i.test(lower);

    // Strict SHM Trigger: Shorthand variables OR strong keywords
    if ((hasK && hasM) || (hasK && hasOscillation)) {
        return "simple_harmonic_motion";
    }

    // Simple Pendulum: if pendulum / bob / suspended+oscillates is detected.
    const hasPendulum = /pendulum|\bbob\b/i.test(lower);
    const hasSuspendedOscillate = /suspended/i.test(lower) && /oscillat/i.test(lower);
    if (hasPendulum || hasSuspendedOscillate) {
        return "simple_pendulum";
    }

    // Pulley System: if 'pulley' or 'atwood' is mentioned, strictly Pulley.
    const hasPulley = /pulley|atwood/i.test(lower);
    if (hasPulley) {
        return "pulley_system";
    }

    // Force Interaction: if 'mass' + 'friction'/'incline'/'normal force', strictly Force Interaction.
    // 'Angle' alone should NOT trigger projectile if these are present.
    const hasFriction = /friction|coefficient|μ|mu\s*=|rough surface/i.test(lower);
    const hasIncline = /incline|ramp|slope|plane/i.test(lower);
    const hasForceKeywords = /push|pull|normal force/i.test(lower);

    if (hasM && (hasFriction || hasIncline || hasForceKeywords)) {
        return "force_interaction";
    }

    // 2. WEIGHTED SCORING
    let bestClass = null;
    let bestScore = 0;

    const scores = {};

    for (const [className, classDef] of Object.entries(physicsClasses)) {
        let score = 0;

        // Keyword matching
        for (const keyword of classDef.keywords) {
            if (lower.includes(keyword.toLowerCase())) {
                // Longer keywords get more weight
                score += keyword.length > 5 ? 3 : 1;
            }
        }

        // Context boosts
        if (className === "simple_harmonic_motion") {
            if (/k\s*=/.test(lower)) score += 5;
            if (/A\s*=/.test(lower)) score += 3;
        }
        if (className === "projectile_motion") {
            // Only boost 'projectile' if explicit launch keywords are present.
            // 'angle' is too generic (used in incline, pendulum, etc).
            if (/launch|fired|cannon|thrown|project/i.test(lower)) score += 3;
            // Only boost angle IF we don't have incline keywords
            if (/angle|degree|°/.test(lower) && !hasIncline) score += 1;
        }

        scores[className] = score;

        if (score > bestScore) {
            bestScore = score;
            bestClass = className;
        }
    }



    // 3. FALLBACK LOGIC
    // Only default to projectile if explicit projectile keywords exist, otherwise unknown?
    // For now, maintain projectile fallback as it is the most common "random" input type,
    // BUT only if score is 0.
    if (bestScore === 0) {
        // Check for projectile indicators
        if (/thrown|launch|ball|project|angle/i.test(lower)) {
            return "projectile_motion";
        }
        // Check for vertical
        if (/drop|fall|cliff/i.test(lower)) {
            return "kinematics_vertical_motion";
        }
        // Default
        return "projectile_motion";
    }

    return bestClass;
}

/**
 * Extract numeric parameters from the problem text.
 */
function extractParameters(text) {
    const extracted = {};

    for (const pattern of extractionPatterns) {
        // Reset regex lastIndex since we reuse them
        pattern.regex.lastIndex = 0;
        const match = pattern.regex.exec(text);
        if (match) {
            // First capturing group that has a value
            const value = parseFloat(match[1] || match[2]);
            if (!isNaN(value) && !extracted[pattern.param]) {
                extracted[pattern.param] = value;
            }
        }
    }

    // Map velocity_raw to the appropriate parameter if no specific velocity was found
    if (extracted.velocity_raw && !extracted.initial_velocity) {
        extracted.initial_velocity = extracted.velocity_raw;
        // Also set generic velocity
        extracted.velocity = extracted.velocity_raw;
    }
    delete extracted.velocity_raw;

    // Convert RPM to rad/s if present
    if (extracted.angular_velocity_rpm) {
        extracted.angular_velocity = (extracted.angular_velocity_rpm * 2 * Math.PI) / 60;
        delete extracted.angular_velocity_rpm;
    }

    return extracted;
}

/**
 * Main parse function: classify + extract + merge with defaults.
 */
function parseProblem(problemText) {
    if (!problemText || typeof problemText !== "string" || problemText.trim().length === 0) {
        return { error: "Empty or invalid problem text." };
    }

    const problemClass = classifyProblem(problemText);
    const classDef = physicsClasses[problemClass];
    const extracted = extractParameters(problemText);

    // Merge: extracted values override defaults
    const parameters = { ...classDef.defaultParams, ...extracted };

    // For projectile_motion, map initial_velocity → velocity for slider compat
    if (problemClass === "projectile_motion") {
        if (extracted.initial_velocity) {
            parameters.initial_velocity = extracted.initial_velocity;
        }
    }

    // For pulley_system, extract two masses from "X kg and Y kg" patterns
    if (problemClass === "pulley_system") {
        const twoMassMatch = problemText.match(/(\d+\.?\d*)\s*kg\s*(?:and|,|&)\s*(\d+\.?\d*)\s*kg/i);
        if (twoMassMatch) {
            parameters.mass1 = parseFloat(twoMassMatch[1]);
            parameters.mass2 = parseFloat(twoMassMatch[2]);
        }
    }

    // For simple_pendulum, extract string length
    if (problemClass === "simple_pendulum") {
        const lenMatch = problemText.match(/(?:length|string|L)\s*(?:of|=|is)?\s*(\d+\.?\d*)\s*(?:m|meter)/i);
        if (lenMatch) {
            parameters.length = parseFloat(lenMatch[1]);
        }
        const angleMatch = problemText.match(/(\d+\.?\d*)\s*(?:°|degree)/i);
        if (angleMatch) {
            parameters.theta0 = parseFloat(angleMatch[1]);
        }
    }

    return {
        problem_class: problemClass,
        problem_label: classDef.label,
        parameters,
        adjustable_parameters: classDef.adjustableParameters,
        relationships: classDef.relationships,
        suggested_visual_template: classDef.visual_template,
        visual_primitives: classDef.visual_primitives
    };
}

module.exports = { parseProblem };
