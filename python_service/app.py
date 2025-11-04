"""
EEA ChatBot Python Service with OpenAI Function Calling
This service connects to OpenAI API and provides MCP tool access
"""
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
import openai
import requests
import json
import os
from typing import List, Dict, Any

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
MCP_BASE_URL = os.environ.get('MCP_BASE_URL', 'http://127.0.0.1:3001/api')

# Validate API key
if not OPENAI_API_KEY:
    print("ERROR: OPENAI_API_KEY not configured. Please set it in .env file")
    exit(1)

# Initialize OpenAI client
try:
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    print(f"OpenAI client initialized successfully")
except Exception as e:
    print(f"ERROR initializing OpenAI client: {e}")
    exit(1)

# Define MCP tools for OpenAI function calling
MCP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_catalogue",
            "description": "Search the EEA SDI Catalogue for geospatial metadata records. Use this when users ask about datasets, environmental data, or want to search the catalogue.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query (e.g., 'water quality', 'biodiversity', 'air pollution')"
                    },
                    "size": {
                        "type": "integer",
                        "description": "Number of results to return (default: 5, max: 20)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_catalogue_tags",
            "description": "Get all available tags/categories in the EEA SDI Catalogue. Use this when users want to browse categories or see what topics are available.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_catalogue_regions",
            "description": "Get available geographic regions in the catalogue. Use this when users ask about geographic coverage or regions.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_record_details",
            "description": "Get detailed information about a specific catalogue record using its UUID. Use this when users want more details about a specific dataset.",
            "parameters": {
                "type": "object",
                "properties": {
                    "uuid": {
                        "type": "string",
                        "description": "The UUID of the record"
                    }
                },
                "required": ["uuid"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_site_info",
            "description": "Get information about the EEA SDI Catalogue site (platform, organization, etc.). Use this when users ask about the catalogue itself.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_catalogue_sources",
            "description": "Get available catalogue sources/sub-portals. Use this when users ask about data sources or sub-portals.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_catalogue_groups",
            "description": "List user groups in the catalogue. Use this when users ask about groups or organizations.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]


def call_mcp_api(endpoint: str, method: str = 'GET', data: Dict = None) -> Dict[str, Any]:
    """
    Call the MCP API endpoint
    """
    url = f"{MCP_BASE_URL}{endpoint}"
    try:
        if method == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            response = requests.get(url, timeout=10)

        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}


def execute_tool_call(tool_name: str, arguments: Dict[str, Any]) -> str:
    """
    Execute MCP tool calls and return results
    """
    try:
        if tool_name == "search_catalogue":
            query = arguments.get("query", "")
            size = arguments.get("size", 5)

            result = call_mcp_api("/search", method="POST", data={
                "query": query,
                "size": min(size, 20)
            })

            if "error" in result:
                return f"Error searching catalogue: {result['error']}"

            hits = result.get("hits", {}).get("hits", [])
            total = result.get("hits", {}).get("total", {}).get("value", 0)

            if not hits:
                return f"No results found for '{query}'."

            # Format results
            response = f"Found {total} results for '{query}':\n\n"
            for idx, hit in enumerate(hits[:size], 1):
                source = hit.get("_source", {})
                title = source.get("resourceTitleObject", {}).get("default", "Untitled")
                abstract = source.get("resourceAbstractObject", {}).get("default", "No description")
                uuid = source.get("uuid", hit.get("_id", ""))

                response += f"{idx}. {title}\n"
                response += f"   {abstract[:200]}{'...' if len(abstract) > 200 else ''}\n"
                response += f"   UUID: {uuid}\n\n"

            return response

        elif tool_name == "get_catalogue_tags":
            result = call_mcp_api("/tags")

            if "error" in result:
                return f"Error fetching tags: {result['error']}"

            if not result:
                return "No tags found."

            response = "Available tags in the catalogue:\n\n"
            for tag in result[:30]:
                label = tag.get("label", {}).get("eng", tag.get("name", "Unknown"))
                response += f"• {label}\n"

            if len(result) > 30:
                response += f"\n... and {len(result) - 30} more tags"

            return response

        elif tool_name == "get_catalogue_regions":
            result = call_mcp_api("/regions")

            if "error" in result:
                return f"Error fetching regions: {result['error']}"

            if not result:
                return "No regions found."

            response = "Available geographic regions:\n\n"
            for region in result[:20]:
                name = region.get("name") or region.get("id", "Unknown")
                response += f"• {name}\n"

            if len(result) > 20:
                response += f"\n... and {len(result) - 20} more regions"

            return response

        elif tool_name == "get_record_details":
            uuid = arguments.get("uuid", "")
            if not uuid:
                return "Error: UUID is required"

            result = call_mcp_api(f"/records/{uuid}")

            if "error" in result:
                return f"Error fetching record: {result['error']}"

            # Extract title
            title = result.get("resourceTitleObject", {}).get("default",
                     result.get("resourceTitleObject", {}).get("langeng", "Untitled"))

            # Extract abstract
            abstract = result.get("resourceAbstractObject", {}).get("default",
                       result.get("resourceAbstractObject", {}).get("langeng", "No description"))

            response = f"**{title}**\n\n"
            response += f"{abstract}\n\n"
            response += f"**UUID:** {uuid}\n\n"

            # Add resource dates
            creation_date = result.get("creationDateForResource", [])
            if creation_date:
                response += f"**Created:** {creation_date[0]}\n"

            publication_date = result.get("publicationDateForResource", [])
            if publication_date:
                response += f"**Published:** {publication_date[0]}\n"

            # Add organization
            org = result.get("OrgForResourceObject", {}).get("default", "")
            if org:
                response += f"**Organization:** {org}\n"

            # Add keywords/tags
            tags = result.get("tag", [])
            if tags:
                response += f"\n**Keywords:**\n"
                tag_names = []
                for tag in tags[:10]:
                    if isinstance(tag, dict):
                        tag_name = tag.get("default", tag.get("langeng", ""))
                    else:
                        tag_name = str(tag)
                    if tag_name:
                        tag_names.append(tag_name)

                response += ", ".join(tag_names)

                if len(tags) > 10:
                    response += f" (and {len(tags) - 10} more)"

            return response

        elif tool_name == "get_site_info":
            result = call_mcp_api("/site")

            if "error" in result:
                return f"Error fetching site info: {result['error']}"

            response = "EEA SDI Catalogue Information:\n\n"

            if result.get("system/site/name"):
                response += f"Name: {result['system/site/name']}\n"

            if result.get("system/platform/version"):
                response += f"Platform: GeoNetwork {result['system/platform/version']}\n"

            if result.get("system/site/organization"):
                response += f"Organization: {result['system/site/organization']}\n"

            return response

        elif tool_name == "get_catalogue_sources":
            result = call_mcp_api("/sources")

            if "error" in result:
                return f"Error fetching sources: {result['error']}"

            if not result:
                return "No catalogue sources found."

            response = "Available Catalogue Sources:\n\n"
            for source in result:
                name = source.get("name") or source.get("label", {}).get("eng") or source.get("uuid", "Unknown")
                response += f"• {name}\n"
                if source.get("uuid"):
                    response += f"  UUID: {source['uuid']}\n"

            return response

        elif tool_name == "list_catalogue_groups":
            result = call_mcp_api("/groups?withReservedGroup=false")

            if "error" in result:
                return f"Error fetching groups: {result['error']}"

            if not result:
                return "No groups found."

            response = "Catalogue Groups:\n\n"
            for group in result[:15]:
                name = group.get("name") or group.get("label", {}).get("eng") or f"Group {group.get('id', 'Unknown')}"
                response += f"• {name}"
                if group.get("description"):
                    response += f" - {group['description'][:100]}"
                response += "\n"

            if len(result) > 15:
                response += f"\n... and {len(result) - 15} more groups"

            return response

        else:
            return f"Unknown tool: {tool_name}"

    except Exception as e:
        return f"Error executing tool {tool_name}: {str(e)}"


@app.route('/chat', methods=['POST'])
def chat():
    """
    Handle chat requests with streaming support
    """
    try:
        data = request.json
        messages = data.get('prompt', [])

        if not messages:
            return Response("Error: No messages provided", status=400)

        # Add system message with context about MCP tools
        system_message = {
            "role": "system",
            "content": """You are a helpful assistant for the European Environment Agency (EEA) that helps users explore the EEA SDI Catalogue of geospatial metadata.

You have access to tools that can search the catalogue, browse tags, regions, and get detailed information about datasets. Use these tools whenever users ask about environmental data, datasets, or the catalogue.

When presenting search results or information from the catalogue, be conversational and helpful. Summarize the information in a user-friendly way."""
        }

        # Prepare messages for OpenAI
        openai_messages = [system_message] + messages

        def generate():
            try:
                # First API call to potentially get tool calls
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=openai_messages,
                    tools=MCP_TOOLS,
                    tool_choice="auto",
                    stream=False
                )

                message = response.choices[0].message

                # Check if the model wants to call tools
                if message.tool_calls:
                    # Execute all tool calls
                    openai_messages.append(message)

                    for tool_call in message.tool_calls:
                        function_name = tool_call.function.name
                        function_args = json.loads(tool_call.function.arguments)

                        # Execute the tool
                        tool_result = execute_tool_call(function_name, function_args)

                        # Add tool result to messages
                        openai_messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,
                            "content": tool_result
                        })

                    # Second API call with tool results - now stream the response
                    stream_response = client.chat.completions.create(
                        model="gpt-4o",
                        messages=openai_messages,
                        stream=True
                    )

                    for chunk in stream_response:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            yield f"data:{json.dumps({'content': content})}\n"

                else:
                    # No tool calls, stream the direct response
                    stream_response = client.chat.completions.create(
                        model="gpt-4o",
                        messages=openai_messages,
                        stream=True
                    )

                    for chunk in stream_response:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            yield f"data:{json.dumps({'content': content})}\n"

            except Exception as e:
                error_msg = f"Error: {str(e)}"
                yield f"data:{json.dumps({'content': error_msg})}\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        return Response(f"Error: {str(e)}", status=500)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "EEA ChatBot with OpenAI"}


if __name__ == '__main__':
    print("="*60)
    print("EEA ChatBot Service - OpenAI with MCP Tools")
    print("="*60)
    print(f"Port: 5000")
    print(f"MCP Server: {MCP_BASE_URL}")
    print(f"OpenAI: Configured")
    print("="*60)
    app.run(host='0.0.0.0', port=5000, debug=False)
