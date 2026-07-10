import uuid

from app.models.audit_event import AuditEventType
from app.models.capability import ALL_CAPABILITIES, Capability
from app.models.terms_acceptance import TermsAcceptance
from app.models.terms_of_service import TermsOfService


class TestTermsOfServiceModel:
    def test_create_platform_terms(self):
        published_by_id = uuid.uuid4()
        terms = TermsOfService(
            terms_type="platform",
            version="1.0.0",
            title="Platform Terms of Service",
            content="These are the platform terms.",
            published_by_id=published_by_id,
        )
        assert terms.terms_type == "platform"
        assert terms.data_resource_id is None
        assert terms.version == "1.0.0"
        assert terms.title == "Platform Terms of Service"
        assert terms.content == "These are the platform terms."
        assert terms.published_by_id == published_by_id

    def test_create_dataset_terms(self):
        published_by_id = uuid.uuid4()
        resource_id = uuid.uuid4()
        terms = TermsOfService(
            terms_type="data_resource",
            data_resource_id=resource_id,
            version="1.0.0",
            title="Dataset Terms",
            content="These are the dataset terms.",
            published_by_id=published_by_id,
        )
        assert terms.terms_type == "data_resource"
        assert terms.data_resource_id == resource_id
        assert terms.version == "1.0.0"

    def test_two_versions_have_distinct_ids_not_null(self):
        published_by_id = uuid.uuid4()
        t1_id = uuid.uuid4()
        t2_id = uuid.uuid4()
        t1 = TermsOfService(
            id=t1_id,
            terms_type="platform",
            version="1.0.0",
            title="v1",
            content="First version.",
            published_by_id=published_by_id,
        )
        t2 = TermsOfService(
            id=t2_id,
            terms_type="platform",
            version="2.0.0",
            title="v2",
            content="Second version.",
            published_by_id=published_by_id,
        )
        assert t1.id == t1_id
        assert t2.id == t2_id
        assert t1.id != t2.id
        assert t1.version != t2.version

    def test_default_terms_type(self):
        terms = TermsOfService(
            version="1.0.0",
            title="Test",
            content="Test content.",
            published_by_id=uuid.uuid4(),
        )
        # terms_type is required — no default
        assert terms.terms_type is None


class TestTermsAcceptanceModel:
    def test_create_acceptance(self):
        user_id = uuid.uuid4()
        terms_id = uuid.uuid4()
        acceptance = TermsAcceptance(
            user_id=user_id,
            terms_of_service_id=terms_id,
        )
        assert acceptance.user_id == user_id
        assert acceptance.terms_of_service_id == terms_id

    def test_unique_acceptance_ids(self):
        id_a = uuid.uuid4()
        id_b = uuid.uuid4()
        a1 = TermsAcceptance(
            id=id_a,
            user_id=uuid.uuid4(),
            terms_of_service_id=uuid.uuid4(),
        )
        a2 = TermsAcceptance(
            id=id_b,
            user_id=uuid.uuid4(),
            terms_of_service_id=uuid.uuid4(),
        )
        assert a1.id != a2.id
        assert a1.id == id_a
        assert a2.id == id_b


class TestTermsRelationship:
    def test_terms_acceptance_relationship(self):
        published_by_id = uuid.uuid4()
        terms = TermsOfService(
            terms_type="platform",
            version="1.0.0",
            title="Test",
            content="Test content.",
            published_by_id=published_by_id,
        )
        user_id = uuid.uuid4()
        acceptance = TermsAcceptance(
            user_id=user_id,
            terms_of_service_id=terms.id,
        )
        acceptance.terms_of_service = terms

        assert len(terms.acceptances) == 1
        assert terms.acceptances[0].user_id == user_id
        assert acceptance.terms_of_service.title == "Test"

    def test_multiple_acceptances_for_one_terms(self):
        published_by_id = uuid.uuid4()
        terms = TermsOfService(
            terms_type="platform",
            version="1.0.0",
            title="Test",
            content="Test content.",
            published_by_id=published_by_id,
        )
        user_a = uuid.uuid4()
        user_b = uuid.uuid4()

        acc_a = TermsAcceptance(user_id=user_a, terms_of_service_id=terms.id)
        acc_a.terms_of_service = terms
        acc_b = TermsAcceptance(user_id=user_b, terms_of_service_id=terms.id)
        acc_b.terms_of_service = terms

        assert len(terms.acceptances) == 2
        user_ids = {a.user_id for a in terms.acceptances}
        assert user_ids == {user_a, user_b}

    def test_no_acceptances_initially(self):
        terms = TermsOfService(
            terms_type="platform",
            version="1.0.0",
            title="Test",
            content="Test content.",
            published_by_id=uuid.uuid4(),
        )
        assert len(terms.acceptances) == 0


class TestUniquenessConstraints:
    def test_terms_same_scope_same_version(self):
        """Verify two TermsOfService with same (type, resource, version)
        carry distinct IDs but represent a DB uniqueness conflict."""
        published_by_id = uuid.uuid4()
        data_resource_id = uuid.uuid4()
        t1 = TermsOfService(
            id=uuid.uuid4(),
            terms_type="data_resource",
            data_resource_id=data_resource_id,
            version="1.0.0",
            title="Dataset Terms",
            content="Content.",
            published_by_id=published_by_id,
        )
        t2 = TermsOfService(
            id=uuid.uuid4(),
            terms_type="data_resource",
            data_resource_id=data_resource_id,
            version="1.0.0",
            title="Dataset Terms",
            content="Content.",
            published_by_id=published_by_id,
        )
        assert t1.id != t2.id
        assert t1.terms_type == t2.terms_type
        assert t1.data_resource_id == t2.data_resource_id
        assert t1.version == t2.version
        # IntegrityError on DB commit

    def test_different_types_same_version_allowed(self):
        published_by_id = uuid.uuid4()
        t1 = TermsOfService(
            terms_type="platform",
            version="1.0.0",
            title="Platform Terms",
            content="Content.",
            published_by_id=published_by_id,
        )
        t2 = TermsOfService(
            terms_type="data_resource",
            data_resource_id=uuid.uuid4(),
            version="1.0.0",
            title="Dataset Terms",
            content="Content.",
            published_by_id=published_by_id,
        )
        assert t1.terms_type != t2.terms_type

    def test_same_user_same_terms_represents_duplicate(self):
        user_id = uuid.uuid4()
        terms_id = uuid.uuid4()
        a1 = TermsAcceptance(
            id=uuid.uuid4(),
            user_id=user_id,
            terms_of_service_id=terms_id,
        )
        a2 = TermsAcceptance(
            id=uuid.uuid4(),
            user_id=user_id,
            terms_of_service_id=terms_id,
        )
        assert a1.id != a2.id
        assert a1.user_id == a2.user_id
        assert a1.terms_of_service_id == a2.terms_of_service_id
        # IntegrityError on DB commit

    def test_different_user_same_terms_allowed(self):
        terms_id = uuid.uuid4()
        a1 = TermsAcceptance(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            terms_of_service_id=terms_id,
        )
        a2 = TermsAcceptance(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            terms_of_service_id=terms_id,
        )
        assert a1.user_id != a2.user_id


class TestAuditEventTypeTerms:
    def test_platform_terms_published_value(self):
        expected = "platform_terms.published"
        assert AuditEventType.PLATFORM_TERMS_PUBLISHED.value == expected

    def test_dataset_terms_published_value(self):
        expected = "dataset_terms.published"
        assert AuditEventType.DATASET_TERMS_PUBLISHED.value == expected

    def test_platform_terms_accepted_value(self):
        expected = "platform_terms.accepted"
        assert AuditEventType.PLATFORM_TERMS_ACCEPTED.value == expected

    def test_dataset_terms_accepted_value(self):
        expected = "dataset_terms.accepted"
        assert AuditEventType.DATASET_TERMS_ACCEPTED.value == expected

    def test_event_types_are_distinct(self):
        types = [
            AuditEventType.PLATFORM_TERMS_PUBLISHED,
            AuditEventType.DATASET_TERMS_PUBLISHED,
            AuditEventType.PLATFORM_TERMS_ACCEPTED,
            AuditEventType.DATASET_TERMS_ACCEPTED,
        ]
        assert len(set(types)) == 4

    def test_terms_event_types_in_enum(self):
        assert AuditEventType("platform_terms.published")
        assert AuditEventType("dataset_terms.published")
        assert AuditEventType("platform_terms.accepted")
        assert AuditEventType("dataset_terms.accepted")


class TestCapabilityTermsManage:
    def test_terms_manage_value(self):
        assert Capability.TERMS_MANAGE.value == "terms.manage"

    def test_terms_manage_in_all_capabilities(self):
        assert "terms.manage" in ALL_CAPABILITIES

    def test_terms_manage_is_distinct(self):
        all_values = {c.value for c in Capability}
        assert "terms.manage" in all_values
        assert all_values == ALL_CAPABILITIES
