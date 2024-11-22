import { ApplicationCommandOptionType, Colors, type APIEmbed } from "discord.js";
import type { ApplicationCommandStructure } from "../types";
import config from "../../config";
import { chat } from "../utils/GroqClient";

const command: ApplicationCommandStructure = {
    data: {
        name: 'chat',
        description: 'chat with the bot',
        options: [
            {
                name: 'message',
                description: 'your message to the bot',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'model',
                description: 'model to use',
                type: ApplicationCommandOptionType.String,
                autocomplete: true
            }
        ]
    },
    execute: async (interaction, client) => {
        const message = interaction.options.getString('message', true);
        const model = interaction.options.getString('model');

        const [{ message: { content } }] = await chat(message,
            'You are an AI assistant.\n' +
            'You can only provide small, simple and quick tasks.\n' +
            'You are limited to few hundred characters length.\n',
            model || undefined); // model || config.GROQ_MODEL
        if (!content) throw Error("No response from the bot.");

        function extractCodeBlocks(input: string): { embeds: APIEmbed[], modifiedString: string } {
            const codeBlockRegex = /```[\s\S]*?```/g;
            const codeBlocks = input.match(codeBlockRegex) || [];

            const embeds = []

            for (const index in codeBlocks) {
                const codeBlockIndex = Number(index) + 1
                input = input.replace(codeBlocks[index], `\`REFERENCE: CODE_BLOCK_${codeBlockIndex}\``);
                embeds.push({
                    title: `CODE_BLOCK_${codeBlockIndex}`,
                    description: codeBlocks[index],
                    color: Colors.White
                })
            }
            const modifiedString = input.trim();
            return { embeds, modifiedString };
        }

        const { embeds, modifiedString } = extractCodeBlocks(content);

        await interaction.followUp({ content: modifiedString, embeds });
    }
}

export default command;