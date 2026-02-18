from argparse import ArgumentParser

from .db import DB_PATH_DEFAULT, get_connection, reset_agent


def main() -> None:
    parser = ArgumentParser(
        description="Reset (delete) all records for a given agent."
    )
    parser.add_argument(
        "--db",
        type=str,
        default=str(DB_PATH_DEFAULT),
        help="Path to the SQLite database.",
    )
    parser.add_argument(
        "--agent",
        type=str,
        required=True,
        help="Agent name (e.g. gemini, openai, claude).",
    )
    args = parser.parse_args()

    conn = get_connection(args.db)
    deleted = reset_agent(conn, args.agent)
    print(f"Deleted {deleted} records for agent '{args.agent}' from DB {args.db}")


if __name__ == "__main__":
    main()

