from apps.core.migrations.v1_0_11_attachment_multilang import (
    migrate as _migrate_v1_0_11,
)


def upgrade(db, from_version, to_version):
    _migrate_v1_0_11(db, __name__, from_version, to_version)
