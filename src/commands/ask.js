const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { SUBJECTS, askQuestion, checkRateLimit, detectSubject } = require('../utils/geminiAI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask any academic question — Math, Science, History, and more!')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question (Hindi, English, or any language)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('subject')
                .setDescription('Subject category (optional — auto-detected if not provided)')
                .setRequired(false)
                .addChoices(
                    { name: '🧮 Mathematics',           value: 'mathematics' },
                    { name: '⚛️ Physics',               value: 'physics' },
                    { name: '🧪 Chemistry',             value: 'chemistry' },
                    { name: '🧬 Biology',               value: 'biology' },
                    { name: '💻 Computer Science',      value: 'computer_science' },
                    { name: '📜 History',               value: 'history' },
                    { name: '🌍 Geography',             value: 'geography' },
                    { name: '💰 Economics',             value: 'economics' },
                    { name: '📖 English & Literature',  value: 'english' },
                    { name: '🏛️ Political Science',     value: 'political_science' },
                    { name: '🧠 Psychology',            value: 'psychology' },
                    { name: '⚙️ Engineering',           value: 'engineering' },
                    { name: '🏥 Medical Science',       value: 'medical_science' },
                    { name: '🎨 Arts',                  value: 'arts' },
                    { name: '⚖️ Law',                   value: 'law' },
                    { name: '💭 Philosophy',            value: 'philosophy' },
                    { name: '🌾 Agriculture',           value: 'agriculture' },
                    { name: '🌱 Environmental Science', value: 'environmental' },
                    { name: '📊 Business & Commerce',   value: 'business' },
                    { name: '🎓 Education',             value: 'education' },
                    { name: '🏗️ Architecture',          value: 'architecture' },
                    { name: '🏅 Sports Science',        value: 'sports' },
                    { name: '📡 Media & Communication', value: 'media' },
                    { name: '📚 General Knowledge',     value: 'general' },
                )
        ),

    async execute(interaction) {
        const userId = interaction.user.id;
        const question = interaction.options.getString('question');
        let subject = interaction.options.getString('subject');

        // ─── Rate Limit Check ───────────────────────────────
        const rateCheck = checkRateLimit(userId);
        if (!rateCheck.allowed) {
            return interaction.reply({
                content: `⏳ Rate limit! Please wait **${rateCheck.waitSeconds}s** before asking another question.\n> You can ask **5 questions per minute**.`,
                ephemeral: true,
            });
        }

        // ─── Auto-detect subject if not provided ────────────
        if (!subject) {
            subject = detectSubject(question);
        }

        const subjectInfo = SUBJECTS[subject] || SUBJECTS.general;

        // ─── Defer reply (AI takes a moment) ────────────────
        await interaction.deferReply();

        try {
            const answer = await askQuestion(question, subject);

            // ─── Split long answers into chunks ─────────────
            const chunks = splitAnswer(answer, 4000);

            // ─── Build main embed ───────────────────────────
            const mainEmbed = new EmbedBuilder()
                .setColor(subjectInfo.color)
                .setAuthor({
                    name: `${subjectInfo.emoji} ${subjectInfo.label}`,
                })
                .setTitle('📝 Answer')
                .setDescription(chunks[0])
                .setFooter({
                    text: `Asked by ${interaction.user.username} • AI-generated — verify important facts`,
                    iconURL: interaction.user.displayAvatarURL({ size: 32 }),
                })
                .setTimestamp();

            const embeds = [mainEmbed];

            // ─── Additional embeds for long answers ─────────
            for (let i = 1; i < chunks.length; i++) {
                const contEmbed = new EmbedBuilder()
                    .setColor(subjectInfo.color)
                    .setDescription(chunks[i]);

                if (i === chunks.length - 1) {
                    contEmbed.setFooter({
                        text: `Part ${i + 1}/${chunks.length} • AI-generated — verify important facts`,
                    });
                } else {
                    contEmbed.setFooter({ text: `Part ${i + 1}/${chunks.length}` });
                }

                embeds.push(contEmbed);
            }

            return interaction.editReply({ embeds });

        } catch (error) {
            console.error('[Ask Command] Error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Error')
                .setDescription(getErrorMessage(error))
                .setFooter({ text: 'Try again in a moment' })
                .setTimestamp();

            return interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};

// ─── Helper: Split long text at natural break points ────────────
function splitAnswer(text, maxLen) {
    if (text.length <= maxLen) return [text];

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLen) {
            chunks.push(remaining);
            break;
        }

        // Find the best split point (paragraph > sentence > word)
        let splitAt = remaining.lastIndexOf('\n\n', maxLen);
        if (splitAt < maxLen * 0.5) {
            splitAt = remaining.lastIndexOf('\n', maxLen);
        }
        if (splitAt < maxLen * 0.3) {
            splitAt = remaining.lastIndexOf('. ', maxLen);
        }
        if (splitAt < maxLen * 0.3) {
            splitAt = maxLen;
        }

        chunks.push(remaining.substring(0, splitAt + 1).trim());
        remaining = remaining.substring(splitAt + 1).trim();
    }

    return chunks;
}

// ─── Helper: User-friendly error messages ───────────────────────
function getErrorMessage(error) {
    const msg = error.message || '';

    if (msg.includes('API_KEY')) {
        return '🔑 Gemini API key is not configured. Admin needs to add `GEMINI_API_KEY` to `.env` file.';
    }
    if (msg.includes('SAFETY')) {
        return '🛡️ The question was flagged by safety filters. Please rephrase your question.';
    }
    if (msg.includes('RATE_LIMIT') || msg.includes('429')) {
        return '⏳ API rate limit reached. Please try again in a minute.';
    }
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        return '📊 API quota exhausted for today. Please try again tomorrow.';
    }

    return `Something went wrong while generating the answer. Please try again.\n\`\`\`${msg.substring(0, 200)}\`\`\``;
}
