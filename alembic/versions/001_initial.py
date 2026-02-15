"""Initial migration

Revision ID: 001
Revises:
Create Date: 2026-02-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("about", sa.Text(), nullable=True),
        sa.Column(
            "privacy_setting",
            sa.Enum("exact", "approximate", name="privacysetting"),
            nullable=False,
            server_default="approximate",
        ),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "listings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("listing_type", sa.Enum("LEND", "SELL", name="listingtype"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("author", sa.String(300), nullable=False),
        sa.Column("isbn", sa.String(20), nullable=True),
        sa.Column("language", sa.String(50), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column(
            "condition",
            sa.Enum("NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR", name="bookcondition"),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("max_lend_days", sa.Integer(), nullable=True),
        sa.Column("deposit_amount", sa.Float(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("AVAILABLE", "RESERVED", "LENT", "SOLD", "HIDDEN", name="listingstatus"),
            nullable=False,
            server_default="AVAILABLE",
        ),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "listing_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), index=True, nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), index=True, nullable=False),
        sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "ACCEPTED", "DECLINED", "CANCELLED", name="requeststatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("proposed_meeting_area", sa.String(300), nullable=True),
        sa.Column("proposed_meeting_time", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("request_id", sa.Integer(), sa.ForeignKey("requests.id"), unique=True, nullable=False),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id"), index=True, nullable=False),
        sa.Column("borrower_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column(
            "transaction_type",
            sa.Enum("LOAN", "SALE", name="transactiontype"),
            nullable=False,
        ),
        sa.Column(
            "state",
            sa.Enum("ACCEPTED", "HANDOVER_CONFIRMED", "RETURNED_CONFIRMED", "COMPLETED", name="transactionstate"),
            nullable=False,
            server_default="ACCEPTED",
        ),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lend_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("transactions.id"), unique=True, nullable=False),
        sa.Column("user1_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("user2_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id"), index=True, nullable=False),
        sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("transactions.id"), index=True, nullable=False),
        sa.Column("rater_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("rated_user_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "blocks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("blocker_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("blocked_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("blocker_id", "blocked_id", name="uq_block"),
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reporter_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("reported_user_id", sa.Integer(), sa.ForeignKey("users.id"), index=True, nullable=False),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("blocks")
    op.drop_table("ratings")
    op.drop_table("notifications")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("transactions")
    op.drop_table("requests")
    op.drop_table("listing_images")
    op.drop_table("listings")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS privacysetting")
    op.execute("DROP TYPE IF EXISTS listingtype")
    op.execute("DROP TYPE IF EXISTS bookcondition")
    op.execute("DROP TYPE IF EXISTS listingstatus")
    op.execute("DROP TYPE IF EXISTS requeststatus")
    op.execute("DROP TYPE IF EXISTS transactiontype")
    op.execute("DROP TYPE IF EXISTS transactionstate")
