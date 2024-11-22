import { readFileSync } from "fs";
import config from "../../config";
import type { ChatInputApplicationCommandStructure } from "../types";
import GroqClient from "../utils/GroqClient";
import { ApplicationCommandOptionType } from "discord.js";

const command: ChatInputApplicationCommandStructure = {
    data: {
        name: 'help',
        description: 'ask about the bot',
        options: [
            {
                name: 'question',
                description: 'your question to the bot',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            }
        ]
    },

    async autocomplete(interaction) {
        const models = config.HELP.QUESTIONS.map(question => ({
            name: question.QUESTION, value: `${question.QUESTION}_${question.REFERENCE}`
        }));
        interaction.respond(models);
    },

    async execute(interaction) {
        const { commandCollection } = await import("..");
        const [question, type, reference] = interaction.options.getString('question', true).split('_');
        const commands = [...commandCollection];

        let response = '';

        const defaultSystemMessage = 'You are a chatbot who will help user to know more about the bot. Your answer should be short.\nReference:';

        const references = {
            get file() {
                return readFileSync(reference || 'README.md', 'utf-8');
            },

            get commandList() {
                return commands.map(command => {
                    const { name, description } = command[1].data;
                    return JSON.stringify({
                        name,
                        description,
                        prefix: '/'
                    }, null, 2)
                })
            },

            get command() {
                return JSON.stringify(
                    commandCollection.get(reference.toLowerCase())?.data, null, 2
                )
            }
        }

        async function COMMAND() {
            if (reference === "LIST")
                response = await GroqClient.chat(
                    question,
                    { systemMessage: `${defaultSystemMessage} ${references.commandList}).join('\n')}` }
                ).then(res => res[0].message.content) || '';
            else
                response = await GroqClient.chat(
                    question,
                    {
                        systemMessage:
                            `${defaultSystemMessage} ${references.command}\n\n` +
                            `Command usage: /command <subcommand> OR <option>:<value> <subcommand's option>:<value>`
                    }
                ).then(res => res[0].message.content) || '';
        }

        async function FILE() {
            response = await GroqClient.chat(
                question, { systemMessage: `${defaultSystemMessage} ${references.file}` }
            ).then(res => res[0].message.content) || '';
        }

        switch (type) {
            case "COMMAND": await COMMAND(); break;
            case "FILE": await FILE(); break;
            default: throw Error("Invalid question.");
        }
        
        await interaction.followUp({ content: response });
    }
}

export default command;